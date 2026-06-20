/**
 * Manager Dashboard — Live team status, compliance alerts, missing entries.
 *
 * Client component that polls the dashboard API every 30 seconds.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ComplianceWarning } from "@/types/compliance";
import { TeamStatusList } from "./team-status-list";
import { MissingEntriesList } from "./missing-entries-list";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface TeamMemberStatus {
  employeeId: string;
  firstName: string;
  lastName: string;
  bundesland: string | null;
  status: "running" | "paused" | "off";
  since: string | null;
  todayNetMinutes: number;
  warnings: ComplianceWarning[];
}

interface MissingEntry {
  employeeId: string;
  employeeName: string;
  date: string;
}

interface DashboardData {
  teamStatus: TeamMemberStatus[];
  complianceAlerts: ComplianceWarning[];
  missingEntries: MissingEntry[];
}

export function ManagerDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["managerDashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard");
      const json: ApiResponse<DashboardData> = await res.json();
      return json.data!;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="shadow-sm rounded-xl">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Dashboard-Daten konnten nicht geladen werden.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { teamStatus, complianceAlerts, missingEntries } = data;

  return (
    <div className="space-y-6">
      {/* Compliance alerts */}
      {complianceAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm rounded-xl">
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-amber-100 text-amber-600">
                <AlertTriangle className="size-4" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Hinweise
              </h3>
            </div>
            <ul className="space-y-1 ml-9">
              {complianceAlerts.map((alert, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {alert.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Missing entries */}
      {missingEntries.length > 0 && (
        <MissingEntriesList entries={missingEntries} />
      )}

      {/* Team status */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Team-Übersicht
        </h2>
        <TeamStatusList members={teamStatus} />
      </div>
    </div>
  );
}
