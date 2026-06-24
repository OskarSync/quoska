/**
 * BillingCard — subscription status + tier upgrade actions.
 *
 * Renders ONLY when the deployment can process payments (at least one
 * STRIPE_*_PRICE_ID set + secret key), and only for admins. On the open-source
 * / self-host build (no keys) this renders nothing — the whole billing surface
 * is hidden.
 *
 * Tiers (centralized in @/config/plans):
 *   free €0 ≤3 · team €9 ≤10 · business €59 ≤50 · pro €99 unlimited
 */

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Plan } from "@/types/tenant";
import { PLANS } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Check, X, AlertCircle } from "lucide-react";

interface BillingStatus {
  plan: Plan;
  billingEnabled: boolean;
  canUpgrade: boolean;
  employeeLimit: number | null;
}

const PAID_TIERS: ReadonlyArray<"team" | "business" | "pro"> = ["team", "business", "pro"];

export function BillingCard() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Show a banner when returning from Stripe checkout (success or cancelled).
  // The query param is cleared after surfacing so it doesn't persist on refresh.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const status = searchParams.get("status");
  const showSuccessBanner = status === "success" && !bannerDismissed;
  const showCancelledBanner = status === "cancelled" && !bannerDismissed;

  const dismissBanner = () => {
    setBannerDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    const qs = params.toString();
    router.replace(qs ? `/app/settings?${qs}` : "/app/settings", { scroll: false });
  };

  const { data, isLoading } = useQuery<BillingStatus>({
    queryKey: ["billingStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/billing/status");
      const json: ApiResponse<BillingStatus> = await res.json();
      return json.data!;
    },
  });

  // Hidden entirely when billing isn't publicly enabled (open-source build).
  if (!isLoading && !data?.canUpgrade) return null;

  const currentPlan = data?.plan ?? "free";

  const startCheckout = async (tier: "team" | "business" | "pro") => {
    const res = await fetch("/api/v1/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const json: ApiResponse<{ url: string }> = await res.json();
    if (json.data?.url) window.location.assign(json.data.url);
  };

  const openPortal = async () => {
    const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
    const json: ApiResponse<{ url: string }> = await res.json();
    if (json.data?.url) window.location.assign(json.data.url);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["billingStatus"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-600" />
          Abrechnung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSuccessBanner && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <Check className="size-4 mt-0.5 shrink-0" />
            <span className="flex-1">Zahlung erhalten — dein Tarif wird in Kürze aktualisiert. Bei Verzögerung „Status aktualisieren“ klicken.</span>
            <button onClick={dismissBanner} aria-label="Schließen" className="shrink-0 text-emerald-600 hover:text-emerald-800">
              <X className="size-4" />
            </button>
          </div>
        )}
        {showCancelledBanner && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span className="flex-1">Checkout abgebrochen — es wurde nichts abgerechnet.</span>
            <button onClick={dismissBanner} aria-label="Schließen" className="shrink-0 text-amber-600 hover:text-amber-800">
              <X className="size-4" />
            </button>
          </div>
        )}
        {isLoading || !data ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktueller Tarif</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold">{PLANS[currentPlan].label}</span>
                  {currentPlan !== "free" && (
                    <Badge className="bg-violet-100 text-violet-700 border-0">
                      <Check className="size-3 mr-1" />
                      Aktiv
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {data.employeeLimit !== null
                  ? `bis ${data.employeeLimit} Mitarbeiter`
                  : "Unbegrenzt"}
              </div>
            </div>

            {/* Tier upgrade grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {PAID_TIERS.map((tier) => {
                const cfg = PLANS[tier];
                const isCurrent = currentPlan === tier;
                return (
                  <div
                    key={tier}
                    className={`rounded-lg border p-3 ${
                      isCurrent ? "border-violet-300 bg-violet-50/50" : "border-border"
                    }`}
                  >
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {cfg.priceEur} €/Monat
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cfg.employeeLimit === null
                        ? "Unbegrenzt"
                        : `bis ${cfg.employeeLimit} Mitarbeiter`}
                    </p>
                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => startCheckout(tier)}
                      className="w-full mt-2"
                    >
                      {isCurrent ? "Aktuell" : `${cfg.label} wählen`}
                    </Button>
                  </div>
                );
              })}
            </div>

            {currentPlan !== "free" && (
              <Button variant="outline" onClick={openPortal} className="w-full">
                Abonnement verwalten / kündigen
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={refresh} className="w-full">
              Status aktualisieren
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
