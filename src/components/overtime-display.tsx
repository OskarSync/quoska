/**
 * Overtime Display — Shows weekly overtime and cumulative overtime.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CalendarDays } from "lucide-react";

interface WeekOvertimeSummary {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
  overtimeDisplay: string;
}

interface OvertimeDisplayProps {
  weeklySummaries: WeekOvertimeSummary[];
  cumulativeOvertimeMinutes: number;
}

/** Format minutes as "+Xh Ym" or "-Xh Ym". */
function formatOvertime(minutes: number): string {
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = Math.round(absMin % 60);
  const sign = minutes >= 0 ? "+" : "-";
  if (h === 0) return `${sign}${m} Min`;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
}

export function OvertimeDisplay({
  weeklySummaries,
  cumulativeOvertimeMinutes,
}: OvertimeDisplayProps) {
  if (weeklySummaries.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 mb-6">
      {/* Cumulative overtime */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kumulierte Überstunden
            </p>
          </div>
          <p
            className={`text-2xl font-bold ${
              cumulativeOvertimeMinutes > 0
                ? "text-green-600"
                : cumulativeOvertimeMinutes < 0
                  ? "text-red-600"
                  : ""
            }`}
          >
            {formatOvertime(cumulativeOvertimeMinutes)}
          </p>
        </CardContent>
      </Card>

      {/* Current week overtime */}
      {weeklySummaries.length > 0 && (
        <Card className="shadow-sm rounded-xl">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="size-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aktuelle Woche
              </p>
            </div>
            <p
              className={`text-2xl font-bold ${
                weeklySummaries[0].overtimeMinutes > 0
                  ? "text-green-600"
                  : weeklySummaries[0].overtimeMinutes < 0
                    ? "text-red-600"
                    : ""
              }`}
            >
              {weeklySummaries[0].overtimeDisplay}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(weeklySummaries[0].workedMinutes / 60 * 10) / 10} von{" "}
              {Math.round(weeklySummaries[0].targetMinutes / 60 * 10) / 10} Std
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
