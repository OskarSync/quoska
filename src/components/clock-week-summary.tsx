/**
 * WeekSummaryCard — shows this week's total worked minutes vs. target,
 * with an overtime/minus-hours indicator.
 */

"use client";

import type { WeekSummary } from "@/types/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, TrendingUp } from "lucide-react";
import {
  formatDuration,
  formatDurationCompact,
} from "@/components/clock-format";

export function WeekSummaryCard({ weekSummary }: { weekSummary: WeekSummary }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Diese Woche
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] rounded-full px-2">
            Soll: {formatDurationCompact(weekSummary.targetMinutes)}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-mono font-bold tracking-tight text-foreground tabular-nums">
            {formatDuration(weekSummary.totalMinutes)}
          </span>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min((weekSummary.totalMinutes / weekSummary.targetMinutes) * 100, 100)}%`,
              background: weekSummary.totalMinutes >= weekSummary.targetMinutes
                ? "linear-gradient(90deg, #34d399, #fbbf24)"
                : "linear-gradient(90deg, #8b5cf6, #6366f1)",
            }}
          />
        </div>

        {weekSummary.overtimeMinutes !== 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className={`size-3 ${weekSummary.overtimeMinutes > 0 ? "text-emerald-500" : "text-muted-foreground"}`} />
            <p className={`text-xs font-medium ${
              weekSummary.overtimeMinutes > 0
                ? "text-emerald-600"
                : "text-muted-foreground"
            }`}>
              {weekSummary.overtimeMinutes > 0 ? "+" : ""}
              {formatDuration(Math.abs(weekSummary.overtimeMinutes))}{" "}
              {weekSummary.overtimeMinutes > 0 ? "Überstunden" : "Minusstunden"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
