/**
 * Dashboard Page — /app/dashboard
 *
 * Manager view: live team status, compliance alerts, missing entries.
 * Employee view: personal summary with links to Stempeln.
 */

import { createClient } from "@/config/supabase/server";
import { ManagerDashboard } from "@/components/manager-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Clock, ClipboardList, Bell, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  let firstName = "";
  let setupComplete = false;
  let role = "employee";

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: employee } = await supabase
        .from("employees")
        .select("first_name, tenant_id, role")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single();

      if (employee) {
        firstName = employee.first_name;
        role = employee.role;

        const { data: tenant } = await supabase
          .from("tenants")
          .select("setup_complete")
          .eq("id", employee.tenant_id)
          .single();

        setupComplete = tenant?.setup_complete ?? false;
      }
    }
  } catch {
    // Gracefully degrade if Supabase client fails
  }

  const isManager = role === "admin" || role === "manager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Willkommen bei Quoska{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-gray-500">
          Zeiterfassung für dein Team
        </p>
      </div>

      {!setupComplete && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertDescription>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  Einrichtung unvollständig
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schließe die Einrichtung ab, um Quoska vollständig zu nutzen.
                </p>
                <Link href="/setup">
                  <Button className="mt-3" size="sm">
                    Einrichtung starten
                  </Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isManager ? (
        <ManagerDashboard />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/app/clock">
            <Card className="rounded-xl border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-center size-10 rounded-lg bg-violet-100 text-violet-600 mb-4">
                  <Clock className="size-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Stempeln</h3>
                <p className="text-sm text-gray-500">
                  Clock in und out mit einem Klick
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/my-times">
            <Card className="rounded-xl border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 text-emerald-600 mb-4">
                  <ClipboardList className="size-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Meine Zeiten</h3>
                <p className="text-sm text-gray-500">
                  Übersicht aller erfassten Zeiten
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/notifications">
            <Card className="rounded-xl border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 text-amber-600 mb-4">
                  <Bell className="size-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Benachrichtigungen</h3>
                <p className="text-sm text-gray-500">
                  Warnungen und Hinweise
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
