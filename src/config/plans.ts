/**
 * Plan configuration — the single source of truth for subscription tiers.
 *
 * Every part of the app (employee limits, billing UI, webhook price→tier
 * mapping, README claims) reads from here, so pricing changes touch one file.
 *
 * Tiers (Option C: tiered flatrate):
 *   free     €0   · bis 3   Mitarbeiter
 *   team     €9   · bis 10  Mitarbeiter
 *   business €59  · bis 50  Mitarbeiter
 *   pro      €99  · unbegrenzt
 *
 * OPEN-SOURCE PATTERN: price IDs are env-driven so the public codebase ships
 * without hardcoded Stripe products. The hoster creates the prices in their own
 * Stripe dashboard and sets STRIPE_<TIER>_PRICE_ID. With none set, billing is
 * disabled and every tenant resolves to `free` (see lib/stripe.ts).
 */

import type { Plan } from "@/types/tenant";
import { serverEnv } from "@/config/env";

export interface PlanConfig {
  /** Display label (German). */
  label: string;
  /** Monthly price in whole euros, for display. null = free. */
  priceEur: number | null;
  /** Max active employees. null = unlimited. */
  employeeLimit: number | null;
}

/** Ordered low → high, used for upgrade flows. */
export const PLAN_ORDER: Plan[] = ["free", "team", "business", "pro"];

export const PLANS: Record<Plan, PlanConfig> = {
  free: { label: "Free", priceEur: 0, employeeLimit: 3 },
  team: { label: "Team", priceEur: 9, employeeLimit: 10 },
  business: { label: "Business", priceEur: 59, employeeLimit: 50 },
  pro: { label: "Pro", priceEur: 99, employeeLimit: null },
};

/** Employee cap for a plan (null = unlimited). */
export function employeeLimitForPlan(plan: Plan | null): number | null {
  if (!plan) return PLANS.free.employeeLimit;
  return PLANS[plan].employeeLimit;
}

/**
 * Map a Stripe Price ID to a plan tier, using the env-configured price IDs.
 * Returns null if the price doesn't match any configured tier (e.g. billing
 * disabled, or an unknown/legacy price).
 */
export function planFromStripePriceId(priceId: string): Plan | null {
  const map: Record<string, Plan> = {
    [serverEnv.STRIPE_TEAM_PRICE_ID ?? ""]: "team",
    [serverEnv.STRIPE_BUSINESS_PRICE_ID ?? ""]: "business",
    [serverEnv.STRIPE_PRO_PRICE_ID ?? ""]: "pro",
  };
  return map[priceId] ?? null;
}

/** All env-configured Stripe price IDs (for the billing-enabled check). */
export function configuredPriceIds(): string[] {
  return [
    serverEnv.STRIPE_TEAM_PRICE_ID,
    serverEnv.STRIPE_BUSINESS_PRICE_ID,
    serverEnv.STRIPE_PRO_PRICE_ID,
  ].filter((p): p is string => !!p);
}
