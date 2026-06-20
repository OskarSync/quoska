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

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Plan } from "@/types/tenant";
import { PLANS } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Check } from "lucide-react";

interface BillingStatus {
  plan: Plan;
  billingEnabled: boolean;
  canUpgrade: boolean;
  employeeLimit: number | null;
}

const PAID_TIERS: ReadonlyArray<"team" | "business" | "pro"> = ["team", "business", "pro"];

export function BillingCard() {
  const queryClient = useQueryClient();

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
