/**
 * Settings Page — /app/settings
 *
 * Admin: DSGVO data export, account deletion.
 * Employee: Personal data export.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWeekBoundsForOffset } from "@/config/client/date-utils";
import { BillingCard } from "@/components/billing-card";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface AuthInfo {
  role: string;
}

export default function SettingsPage() {
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { data: authInfo } = useQuery<AuthInfo>({
    queryKey: ["auth-info"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees/me");
      if (!res.ok) return { role: "employee" };
      const json: ApiResponse<{ role: string }> = await res.json();
      return { role: json.data?.role ?? "employee" };
    },
  });

  const isAdmin = authInfo?.role === "admin";

  const handleExport = async (type: "csv" | "my-data") => {
    setIsExporting(type);
    try {
      let url = "";
      switch (type) {
        case "csv":
          url = `/api/v1/reports/export/csv?startDate=${getWeekStartDate()}&endDate=${getWeekEndDate()}`;
          break;
        case "my-data":
          url = "/api/v1/my-data/export";
          break;
      }

      const res = await fetch(url);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export fehlgeschlagen");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"|filename=([^;]+)/);
      const filename = filenameMatch?.[1] ?? filenameMatch?.[2] ?? `export.csv`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setIsExporting(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteMessage(null);

    try {
      const res = await fetch("/api/v1/settings/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        setDeleteError(json.error ?? "Fehler beim Anfordern der Löschung");
        return;
      }

      setDeleteMessage(json.data?.message ?? "Löschung angefordert.");
      setDeletePassword("");
    } catch {
      setDeleteError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export, DSGVO und Account
        </p>
      </div>

      <div className="space-y-8">
        {/* Billing (only renders on the hosted/commercial build) */}
        <BillingCard />

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lade deine Zeiterfassungsdaten herunter.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting === "csv"}
                >
                  {isExporting === "csv" ? "Wird exportiert…" : "CSV Export"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => handleExport("my-data")}
                disabled={isExporting === "my-data"}
              >
                {isExporting === "my-data"
                  ? "Wird exportiert…"
                  : "Meine Daten exportieren (Art. 20 DSGVO)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone (admin only) */}
        {isAdmin && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-700">Account löschen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-600">
                Alle Daten werden nach einer 14-tägigen Wartefrist unwiderruflich
                gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>

              {deleteMessage ? (
                <Alert>
                  <AlertDescription className="text-green-700">{deleteMessage}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="delete-password" className="text-red-700">
                      Passwort zur Bestätigung
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="max-w-[16rem]"
                      placeholder="Dein Passwort"
                    />
                  </div>

                  {deleteError && (
                    <p className="text-sm text-red-600">{deleteError}</p>
                  )}

                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={!deletePassword || isDeleting}
                  >
                    {isDeleting
                      ? "Wird angefragt…"
                      : "Account und alle Daten löschen"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getWeekStartDate(): string {
  return getWeekBoundsForOffset(0).start;
}

function getWeekEndDate(): string {
  return getWeekBoundsForOffset(0).end;
}
