/**
 * POST /api/v1/stripe/webhook
 *
 * Receives Stripe webhook events. Verifies the signature using the raw body
 * and STRIPE_WEBHOOK_SECRET, then processes idempotently.
 *
 * IMPORTANT: Stripe sends an unsigned-extended JSON body. Next.js Route
 * Handlers parse JSON by default, which breaks signature verification — so we
 * read the raw body via `request.text()` and pass it to stripe.webhooks
 * .constructEvent. Do NOT wrap this route in JSON body parsing middleware.
 *
 * No auth check — verified by the webhook signature instead.
 * Returns 200 even for "ignored" events so Stripe stops retrying.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import { getStripe } from "@/lib/stripe";
import { processWebhookEvent } from "@/services/subscriptionService";

export async function POST(request: Request) {
  const stripe = getStripe();
  // Billing disabled → nothing to do. Still 200 so Stripe (if misconfigured)
  // doesn't retry forever.
  if (!stripe || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook handler inactive (billing disabled)" },
      { status: 200 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const result = await processWebhookEvent(supabase, event);
    if (!result.data) {
      console.error("Webhook processing failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ received: true, result: result.data }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook-Verarbeitung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
