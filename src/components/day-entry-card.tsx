/**
 * DayEntryCard — presentational component rendering a single day's time
 * entries with day balance header, grouped entry rows, and the per-entry
 * correction-request action.
 *
 * Pure/presentational: all data arrives via props.
 */

"use client";

import type { CorrectionRequest } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pause, Briefcase, FilePenLine } from "lucide-react";
import { formatTimeLocal, getLocalToday } from "@/config/client/date-utils";
import {
  DAYS_DE_FULL,
  formatFullDate,
  formatDurationCompact,
  formatBalance,
  getDayIndex,
  type TimeEntryWithNet,
} from "@/components/employee-self-service-helpers";

interface DayEntryCardProps {
  date: string;
  entries: TimeEntryWithNet[];
  corrections: CorrectionRequest[] | undefined;
  dailyTarget: number;
  onRequestCorrection: (entry: TimeEntryWithNet) => void;
}

export function DayEntryCard({
  date,
  entries,
  corrections,
  dailyTarget,
  onRequestCorrection,
}: DayEntryCardProps) {
  const dayIdx = getDayIndex(date);
  const dayWorked = entries.reduce((sum, e) => sum + e.netMinutes, 0);
  const dayBalance = dayWorked - dailyTarget;
  const isToday = date === getLocalToday();

  return (
    <Card key={date} className="shadow-sm overflow-hidden">
      {/* Day header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${
        isToday ? "bg-primary/5" : "bg-muted/30"
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {DAYS_DE_FULL[dayIdx]}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFullDate(date)}
          </span>
          {isToday && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full bg-primary/10 text-primary">
              Heute
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDurationCompact(dayWorked)}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 rounded-full font-mono tabular-nums ${
              dayBalance > 0
                ? "bg-emerald-50 text-emerald-700"
                : dayBalance < 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-50 text-gray-500"
            }`}
          >
            {formatBalance(dayBalance)}
          </Badge>
        </div>
      </div>

      {/* Entries for this day */}
      <div>
        {entries.map((entry, i) => {
          const hasPendingCorrection = corrections?.some(
            (c) => c.time_entry_id === entry.id && c.status === "pending",
          );

          return (
            <div key={entry.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  {/* Time row */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-foreground tabular-nums">
                      {formatTimeLocal(entry.clock_in)}
                    </span>
                    <span className="text-muted-foreground">–</span>
                    <span className={`font-medium tabular-nums ${
                      entry.clock_out ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {entry.clock_out ? formatTimeLocal(entry.clock_out) : "läuft…"}
                    </span>
                    {entry.status === "running" && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full bg-emerald-50 text-emerald-600 ml-1">
                        Aktiv
                      </Badge>
                    )}
                  </div>

                  {/* Details row */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.break_minutes > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Pause className="size-2.5" />
                        {entry.break_minutes} Min
                      </span>
                    )}
                    {entry.project_id && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Briefcase className="size-2.5" />
                        Projekt
                      </span>
                    )}
                    {hasPendingCorrection && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded-full bg-amber-50 text-amber-700">
                        <FilePenLine className="size-2.5 mr-0.5" />
                        Korrektur offen
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right side: net time + action */}
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className={`text-sm font-mono font-medium tabular-nums ${
                    entry.netMinutes > 0 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {formatDurationCompact(entry.netMinutes)}
                  </span>
                  {entry.status === "completed" && !hasPendingCorrection && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Korrektur anfordern"
                      title="Korrektur anfordern"
                      onClick={() => onRequestCorrection(entry)}
                    >
                      <FilePenLine className="size-3" />
                      <span className="sr-only">Korrektur anfordern</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
