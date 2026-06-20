"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/config/supabase/client";
import { type SetupCompanyInput } from "@/types/setup";
import { CompanyStep } from "@/components/setup-company-step";
import { InviteStep } from "@/components/setup-invite-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, PartyPopper } from "lucide-react";

type SetupStep = "company" | "invite" | "done";

interface InviteRow {
  firstName: string;
  lastName: string;
  email: string;
}

const STEPS = [
  { key: "company" as const, label: "1. Firma", number: 1 },
  { key: "invite" as const, label: "2. Team", number: 2 },
  { key: "done" as const, label: "3. Fertig!", number: 3 },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([
    { firstName: "", lastName: "", email: "" },
  ]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    async function checkSetup() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/v1/tenants/setup?userId=${user.id}`);
      if (res.ok) {
        const result = await res.json();
        if (result.data?.setupComplete) {
          router.push("/app/dashboard");
          return;
        }
        if (result.data?.tenantId) {
          setTenantId(result.data.tenantId);
        }
      }
    }
    checkSetup();
  }, [router]);

  async function onSubmitCompany(data: SetupCompanyInput) {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Nicht angemeldet");
        return;
      }

      const res = await fetch("/api/v1/tenants/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: user.id }),
      });

      const result = await res.json();
      if (result.error) {
        setError(result.error);
        return;
      }

      setTenantId(result.data.tenantId);
      setStep("invite");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitInvites() {
    setLoading(true);
    setError(null);

    try {
      const validInvites = invites.filter(
        (i) => i.firstName && i.lastName && i.email,
      );

      for (const invite of validInvites) {
        const res = await fetch("/api/v1/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: invite.firstName,
            lastName: invite.lastName,
            email: invite.email,
            role: "employee",
          }),
        });

        const result = await res.json();
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      await fetch("/api/v1/tenants/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, setupComplete: true }),
      });

      setStep("done");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Einrichtung</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Richte Quoska für dein Team ein
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex items-start justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      step === s.key
                        ? "bg-primary text-primary-foreground"
                        : currentStepIndex > i
                          ? "bg-success text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStepIndex > i ? <Check className="size-4" /> : s.number}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-px w-8 bg-border" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {step === "company" && (
            <CompanyStep
              onSubmit={onSubmitCompany}
              loading={loading}
              error={error}
            />
          )}

          {step === "invite" && (
            <InviteStep
              invites={invites}
              setInvites={setInvites}
              onSubmit={onSubmitInvites}
              onBack={() => setStep("company")}
              loading={loading}
              error={error}
            />
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="text-4xl"><PartyPopper className="size-10 mx-auto text-amber-500" /></div>
              <h2 className="text-lg font-semibold">Fertig!</h2>
              <p className="text-sm text-muted-foreground">
                Quoska ist eingerichtet. Dein Team kann jetzt mit der
                Zeiterfassung starten.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push("/app/dashboard")}
              >
                Zum Dashboard →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
