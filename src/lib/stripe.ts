/**
 * Stripe client + billing-enabled flag.
 *
 * OPEN-SOURCE PATTERN (mirrors Rybbit): the Stripe SDK client is `null` when
 * STRIPE_SECRET_KEY is unset. Every billing function checks for null and
 * degrades gracefully — the app runs fully on the free plan with no payment
 * wiring. The same codebase therefore serves two deployments:
 *
 *   - Self-host / open-source (no keys):  everyone free, checkout/webhook
 *     routes inert, billing UI hidden.
 *   - Hosted / commercial (keys set):    live Stripe, plan upgrades enforced.
 *
 * No feature flags, no compiled-out modules, no dual codebase.
 *
 * The client is lazily initialised (getter) so importing this module never
 * triggers env validation or network setup — safe to import from tests and
 * from code paths that may never use billing.
 */

import Stripe from "stripe";
import { serverEnv } from "@/config/env";

let _client: Stripe | null | undefined;

/**
 * Lazily-created Stripe client. Null when STRIPE_SECRET_KEY is unset.
 * Always null-check before use: `const s = getStripe(); if (!s) return ...`.
 */
export function getStripe(): Stripe | null {
  if (_client !== undefined) return _client;
  const key = serverEnv.STRIPE_SECRET_KEY;
  _client = key
    ? new Stripe(key, {
        // Automatically retry on 429 / transient 5xx with exponential backoff.
        maxNetworkRetries: 3,
      })
    : null;
  return _client;
}

/**
 * True only when the deployment can actually process payments.
 * Gates: a secret key AND a product price to sell.
 */
export function isBillingEnabled(): boolean {
  return getStripe() !== null && !!serverEnv.STRIPE_PRO_PRICE_ID;
}

/**
 * The Stripe Price ID for the Pro plan. Env-driven so the open-source code
 * ships without a hardcoded product — the hoster creates the product in their
 * own Stripe dashboard and sets the ID. Null when unset.
 */
export function getProPriceId(): string | null {
  return serverEnv.STRIPE_PRO_PRICE_ID ?? null;
}
