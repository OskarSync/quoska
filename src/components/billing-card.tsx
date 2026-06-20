/**
 * BillingCard — subscription status + upgrade/manage actions.
 *
 * Renders ONLY when the deployment can process payments
 * (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + STRIPE_PRO_PRICE_ID set), and only for
 * admins. On the open-source / self-host build (no keys) this component
 * renders nothing — the whole billing surface is hidden.
 *
 * Fetches /api/v1/billing/status, shows the current plan, and offers either
 * "Auf Pro upgraden" (checkout) or "Abonnement verwalten" (Stripe portal).
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Plan } from "@/types/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface BillingStatus {
  plan: Plan;
  billingEnabled: boolean;
  canUpgrade: boolean;
  freeLimit: number | null;
}

const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  team: "Team",
  pro: "Pro",
};

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

  const isPro = data?.plan === "pro";

  const startCheckout = async () => {
    const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
    const json: ApiResponse<{ url: string }> = await res.json();
    if (json.data?.url) window.location.href = json.data.url;
  };

  const openPortal = async () => {
    const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
    const json: ApiResponse<{ url: string }> = await res.json();
    if (json.data?.url) window.location.href = json.data.url;
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
                  <span className="text-lg font-semibold">{PLAN_LABEL[data.plan]}</span>
                  {isPro && (
                    <Badge className="bg-violet-100 text-violet-700 border-0">
                      <CheckCircle2 className="size-3 mr-1" />
                      Aktiv
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {data.freeLimit !== null
                  ? `${data.freeLimit} Mitarbeiter`
                  : "Unbegrenzt"}
              </div>
            </div>

            {isPro ? (
              <Button variant="outline" onClick={openPortal} className="w-full">
                Abonnement verwalten
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Upgrade auf Pro für unbegrenzte Mitarbeiter — 39&nbsp;€&nbsp;/&nbsp;Monat.
                </p>
                <Button onClick={startCheckout} className="w-full">
                  Auf Pro upgraden
                </Button>
              </>
            )}

            {/* After returning from checkout/portal, allow a manual refresh */}
            <Button variant="ghost" size="sm" onClick={refresh} className="w-full">
              Status aktualisieren
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
