/**
 * Subscription Repo — DB access for Stripe billing.
 *
 * - Idempotent webhook event logging (subscription_events.stripe_event_id UNIQUE)
 * - Tenant plan + stripe_customer_id reads/writes
 *
 * This file is in the Repos layer. It imports from Types and Config only.
 * Uses the admin client (RLS-bypassing) — callers are server-only routes
 * (webhook with signature verification, billing status for the logged-in user).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/types/tenant";

/** Record a webhook event, returning true if it is new (first time seen). */
export async function recordWebhookEvent(
  supabase: SupabaseClient,
  data: {
    tenant_id: string | null;
    stripe_event_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  },
): Promise<boolean> {
  const { data: inserted, error } = await supabase
    .from("subscription_events")
    .insert({
      tenant_id: data.tenant_id,
      stripe_event_id: data.stripe_event_id,
      event_type: data.event_type,
      payload: data.payload,
      processed: false,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = unique_violation → duplicate delivery, already processed.
    // The supabase-js error code lives in `.code`.
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }
  return !!inserted;
}

/** Mark a webhook event as processed. */
export async function markWebhookProcessed(
  supabase: SupabaseClient,
  stripeEventId: string,
): Promise<void> {
  await supabase
    .from("subscription_events")
    .update({ processed: true })
    .eq("stripe_event_id", stripeEventId);
}

/** Set a tenant's plan (free | team | pro). */
export async function setTenantPlan(
  supabase: SupabaseClient,
  tenantId: string,
  plan: Plan,
): Promise<void> {
  await supabase
    .from("tenants")
    .update({ plan })
    .eq("id", tenantId);
}

/** Link a Stripe customer to a tenant (idempotent). */
export async function setTenantStripeCustomer(
  supabase: SupabaseClient,
  tenantId: string,
  stripeCustomerId: string,
): Promise<void> {
  await supabase
    .from("tenants")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", tenantId);
}

/** Find a tenant by its linked Stripe customer id. */
export async function getTenantByStripeCustomer(
  supabase: SupabaseClient,
  stripeCustomerId: string,
): Promise<{ id: string; plan: Plan } | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, plan")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, plan: data.plan as Plan };
}
