/**
 * ProjectReportTable — Shows aggregated hours per project/customer.
 * Displayed on the reports page under the "Projekte" tab.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ProjectReportRow } from "@/types";
import { getWeekBoundsForOffset } from "@/config/client/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

export function ProjectReportTable() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { start, end } = getWeekBoundsForOffset(weekOffset);

  const { data: rows, isLoading } = useQuery<ProjectReportRow[]>({
    queryKey: ["projectReport", start, end],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/reports/projects?startDate=${start}&endDate=${end}`,
      );
      const json: ApiResponse<ProjectReportRow[]> = await res.json();
      return json.data ?? [];
    },
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setWeekOffset((w) => w - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium min-w-[100px] text-center">
          {weekOffset === 0 ? "Diese Woche" : `Woche ${weekOffset < 0 ? "" : "+"}${weekOffset}`}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={weekOffset >= 0}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Report table */}
      {!rows || rows.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Keine Projektdaten für diesen Zeitraum.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Projekt</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stunden</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Einträge</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Mitarbeiter</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.project_id ?? "__none__"} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">{row.project_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.customer_name ?? "–"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatDuration(row.total_minutes)}</td>
                  <td className="px-4 py-2.5 text-right">{row.entry_count}</td>
                  <td className="px-4 py-2.5 text-right">{row.employee_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
