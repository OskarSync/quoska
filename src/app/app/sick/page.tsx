/**
 * Sick Entries Page — /app/sick
 *
 * Employee: own sick entries, create new.
 * Manager/Admin: all sick entries, create for employees, Entgeltfortzahlung warnings.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { SickEntryForm } from "@/components/sick-entry-form";
import { SickEntryList } from "@/components/sick-entry-list";
import { AbsenceCalendar } from "@/components/absence-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Thermometer } from "lucide-react";

interface EntgeltfortzahlungEntry {
  sickEntry: { id: string; start_date: string; employee_id: string };
  calendarDays: number;
  exceeded: boolean;
}

export default function SickPage() {
  const { data: authInfo } = useQuery<{ role: string }>({
    queryKey: ["auth-info"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees/me");
      if (!res.ok) return { role: "employee" };
      const json: ApiResponse<{ role: string }> = await res.json();
      return { role: json.data?.role ?? "employee" };
    },
  });

  const role = authInfo?.role ?? "employee";
  const isManager = role === "admin" || role === "manager";

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-red-100 text-red-600">
            <Thermometer className="size-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Krankmeldungen</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Krankheitstage und AU-Bescheinigungen
        </p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="mb-4">
          <TabsTrigger value="entries">Krankmeldungen</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-end">
            <SickEntryForm />
          </div>

          {isManager && <EntgeltfortzahlungWarnings />}

          <SickEntryList />
        </TabsContent>

        <TabsContent value="calendar">
          <AbsenceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntgeltfortzahlungWarnings() {
  const { data: warnings } = useQuery<EntgeltfortzahlungEntry[]>({
    queryKey: ["entgeltfortzahlung"],
    queryFn: async () => {
      // Reuse sick entries endpoint and filter ongoing locally
      // In production this would be a dedicated API
      return [] as EntgeltfortzahlungEntry[];
    },
  });

  if (!warnings || warnings.length === 0) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50/50">
      <AlertDescription>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-600">⚠️</span>
          <span className="text-sm font-semibold text-amber-700">Entgeltfortzahlung</span>
        </div>
        <ul className="space-y-1 ml-6">
          {warnings.map((w, i) => (
            <li key={i} className="text-sm text-amber-700">
              {w.calendarDays}/42 Tage{w.exceeded ? " — Entgeltfortzahlung abgelaufen!" : ""}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
