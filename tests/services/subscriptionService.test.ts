/**
 * Unit tests for subscriptionService — plan resolution + webhook processing.
 *
 * These test the pure logic with a minimal in-memory Supabase stub and real
 * Stripe.Event objects constructed via Stripe.Event-like literals. The Stripe
 * SDK client is null here (no secret key in test env), which exercises the
 * "billing disabled" path for the resolver; webhook processing is tested with
 * hand-built events that don't touch the SDK.
 */

import { describe, test, expect } from "vitest";
import type Stripe from "stripe";
import type { Plan } from "@/types/tenant";

// ---- Minimal in-memory Supabase stub -------------------------------------

interface TenantRow {
  id: string;
  plan: Plan;
  stripe_customer_id: string | null;
}

function makeSupabase(tenants: TenantRow[]) {
  const events = new Map<string, boolean>(); // stripe_event_id -> processed

  const table = (name: string) => {
    const queryBuilder = {
      // tenants / employees reads
      select: (cols: string) => ({
        eq: (col: string, val: string) => ({
          single: async () => {
            if (name === "tenants") {
              const t = tenants.find((x) => x.id === val);
              if (!t) return { data: null };
              const out: Record<string, unknown> = {};
              for (const c of cols.split(",").map((s) => s.trim())) out[c] = (t as unknown as Record<string, unknown>)[c];
              return { data: out };
            }
            if (name === "employees") return { data: { email: "owner@test" } };
            return { data: null };
          },
          maybeSingle: async () => {
            if (name === "tenants") {
              // find by stripe_customer_id (col === "stripe_customer_id")
              const t = tenants.find((x) => x.stripe_customer_id === val);
              if (!t) return { data: null };
              return { data: { id: t.id, plan: t.plan } };
            }
            return { data: null };
          },
        }),
      }),
      // writes
      update: (patch: Record<string, unknown>) => ({
        eq: (col: string, val: string) => {
          if (name === "tenants" && col === "id") {
            const t = tenants.find((x) => x.id === val);
            if (t) Object.assign(t, patch);
          }
          if (name === "subscription_events" && col === "stripe_event_id") {
            events.set(val, true);
          }
          return { maybeSingle: async () => ({ data: { id: val } }) };
        },
      }),
      insert: (row: Record<string, unknown>) => {
        const id = row.stripe_event_id as string;
        if (events.has(id)) {
          // simulate unique violation
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { code: "23505", message: "duplicate" },
              }),
            }),
          };
        }
        events.set(id, false);
        return {
          select: () => ({ maybeSingle: async () => ({ data: { id }, error: null }) }),
        };
      },
    };
    return queryBuilder;
  };

  return {
    from: (name: string) => table(name),
    _tenants: tenants,
    _events: events,
  };
}

// ---- Helpers to build Stripe events --------------------------------------

function checkoutEvent(opts: {
  id: string;
  tenantId: string;
  customerId: string;
  paid: boolean;
}): Stripe.Event {
  return {
    id: opts.id,
    type: "checkout.session.completed",
    data: {
      object: {
        object: "checkout.session",
        client_reference_id: opts.tenantId,
        customer: opts.customerId,
        payment_status: opts.paid ? "paid" : "unpaid",
      } as unknown as Record<string, unknown>,
    },
  } as unknown as Stripe.Event;
}

function subscriptionEvent(opts: {
  id: string;
  type: Stripe.Event.Type;
  customerId: string;
  status: string;
  tenantId?: string;
}): Stripe.Event {
  return {
    id: opts.id,
    type: opts.type,
    data: {
      object: {
        object: "subscription",
        customer: opts.customerId,
        status: opts.status,
        metadata: opts.tenantId ? { tenantId: opts.tenantId } : {},
      } as unknown as Record<string, unknown>,
    },
  } as unknown as Stripe.Event;
}

// ---- Tests ---------------------------------------------------------------

import { processWebhookEvent, getActivePlan } from "@/services/subscriptionService";

describe("getActivePlan", () => {
  test("returns the tenant's stored plan with billingEnabled flag", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: null }]);
    const res = await getActivePlan(supabase as never, "t1");
    expect(res.data?.plan).toBe("free");
    expect(typeof res.data?.billingEnabled).toBe("boolean");
  });

  test("falls back to free when tenant missing", async () => {
    const supabase = makeSupabase([]);
    const res = await getActivePlan(supabase as never, "missing");
    expect(res.data?.plan).toBe("free");
  });
});

describe("processWebhookEvent — idempotency", () => {
  test("first delivery processes; second delivery is ignored as duplicate", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: null }]);
    const ev = checkoutEvent({ id: "evt_1", tenantId: "t1", customerId: "cus_1", paid: true });

    const first = await processWebhookEvent(supabase as never, ev);
    expect(first.data?.status).toBe("processed");
    expect(supabase._tenants[0].plan).toBe("pro");

    const second = await processWebhookEvent(supabase as never, ev);
    expect(second.data?.status).toBe("ignored_duplicate");
    // plan unchanged by the duplicate
    expect(supabase._tenants[0].plan).toBe("pro");
  });
});

describe("processWebhookEvent — checkout.session.completed", () => {
  test("paid checkout links customer and upgrades to pro", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: null }]);
    const ev = checkoutEvent({ id: "evt_co1", tenantId: "t1", customerId: "cus_X", paid: true });
    const res = await processWebhookEvent(supabase as never, ev);
    expect(res.data?.status).toBe("processed");
    expect(supabase._tenants[0].plan).toBe("pro");
    expect(supabase._tenants[0].stripe_customer_id).toBe("cus_X");
  });

  test("unpaid checkout leaves plan as free", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: null }]);
    const ev = checkoutEvent({ id: "evt_co2", tenantId: "t1", customerId: "cus_Y", paid: false });
    const res = await processWebhookEvent(supabase as never, ev);
    expect(res.data?.status).toBe("processed");
    expect(supabase._tenants[0].plan).toBe("free");
    expect(supabase._tenants[0].stripe_customer_id).toBe("cus_Y");
  });
});

describe("processWebhookEvent — subscription sync", () => {
  test("active subscription → pro", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: "cus_A" }]);
    const ev = subscriptionEvent({
      id: "evt_sub1",
      type: "customer.subscription.updated",
      customerId: "cus_A",
      status: "active",
    });
    const res = await processWebhookEvent(supabase as never, ev);
    expect(res.data?.status).toBe("processed");
    expect(supabase._tenants[0].plan).toBe("pro");
  });

  test("canceled subscription → free", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "pro", stripe_customer_id: "cus_A" }]);
    const ev = subscriptionEvent({
      id: "evt_sub2",
      type: "customer.subscription.deleted",
      customerId: "cus_A",
      status: "canceled",
    });
    const res = await processWebhookEvent(supabase as never, ev);
    expect(res.data?.status).toBe("processed");
    expect(supabase._tenants[0].plan).toBe("free");
  });

  test("unknown event type is ignored without error", async () => {
    const supabase = makeSupabase([{ id: "t1", plan: "free", stripe_customer_id: null }]);
    const ev = {
      id: "evt_unk",
      type: "invoice.paid",
      data: { object: { object: "invoice" } },
    } as unknown as Stripe.Event;
    const res = await processWebhookEvent(supabase as never, ev);
    expect(res.data?.status).toBe("ignored_unknown");
    expect(res.data).not.toHaveProperty("tenantId");
  });
});
