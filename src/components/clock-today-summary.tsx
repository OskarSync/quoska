/**
 * TodaySummaryCard — shows today's clock in/out, break, and net minutes.
 */

"use client";

import type { TodaySummary } from "@/types/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { formatTimeLocal } from "@/config/client/date-utils";
import { formatDuration } from "@/components/clock-format";

export function TodaySummaryCard({ todaySummary }: { todaySummary: TodaySummary }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Heute
          </span>
        </div>
        <Separator className="mb-2" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            {formatTimeLocal(todaySummary.clockIn!)}
            {todaySummary.clockOut ? ` – ${formatTimeLocal(todaySummary.clockOut)}` : ""}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>Pause: {formatDuration(todaySummary.breakMinutes)}</span>
          <Separator orientation="vertical" className="h-3" />
          <span className="text-foreground font-medium">
            Netto: {formatDuration(todaySummary.netMinutes)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
