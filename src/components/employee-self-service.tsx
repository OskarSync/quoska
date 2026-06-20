/**
 * Employee Self-Service — My times with weekly balance and day-grouped entries.
 *
 * Redesigned as a premium weekly view that mirrors the balance concept
 * from the clock page: each day shows balance relative to daily target,
 * and the week shows cumulative status.
 *
 * Built on shadcn/ui components.
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { CorrectionRequest } from "@/types/database";
import { CorrectionRequestDialog } from "@/components/correction-request-dialog";
import { ActivityGrid, type DayActivity } from "@/components/activity-grid";
import { DayEntryCard } from "@/components/day-entry-card";
import { getWeekBoundsForOffset } from "@/config/client/date-utils";
import {
  getWeekDays,
  formatShortDate,
  formatBalance,
  formatDurationCompact,
  type TimeEntryWithNet,
  type MyTimesData,
} from "@/components/employee-self-service-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

export function EmployeeSelfService() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [correctionEntry, setCorrectionEntry] = useState<TimeEntryWithNet | null>(null);

  const { start, end } = getWeekBoundsForOffset(weekOffset);

  const { data, isLoading, refetch } = useQuery<MyTimesData>({
    queryKey: ["myTimes", start, end],
    queryFn: async () => {
      const res = await fetch(`/api/v1/my-times?startDate=${start}&endDate=${end}`);
      const json: ApiResponse<MyTimesData> = await res.json();
      return json.data!;
    },
  });

  // Rolling 12-month data for the activity grid
  const { data: activityData } = useQuery<{ entries: TimeEntryWithNet[] }>({
    queryKey: ["myTimes", "activity"],
    queryFn: async () => {
      // eslint-disable-next-line @quoska/legal/no-client-timestamps
      const now = new Date();
      // eslint-disable-next-line @quoska/legal/no-client-timestamps
      const yearAgo = new Date(now);
      yearAgo.setDate(now.getDate() - 365);
      const res = await fetch(`/api/v1/my-times?startDate=${toISO(yearAgo)}&endDate=${toISO(now)}`);
      const json: ApiResponse<{ entries: TimeEntryWithNet[] }> = await res.json();
      return json.data ?? { entries: [] };
    },
    staleTime: 120_000,
  });

  function toISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Build activity map for the grid
  const activityMap = useMemo(() => {
    const map = new Map<string, DayActivity>();
    if (activityData?.entries) {
      for (const entry of activityData.entries) {
        const existing = map.get(entry.date);
        if (existing) {
          existing.workedMinutes += entry.netMinutes;
        } else {
          map.set(entry.date, { date: entry.date, workedMinutes: entry.netMinutes });
        }
      }
    }
    return map;
  }, [activityData]);

  const { data: corrections, refetch: refetchCorrections } = useQuery<CorrectionRequest[]>({
    queryKey: ["myCorrections"],
    queryFn: async () => {
      const res = await fetch("/api/v1/corrections");
      const json: ApiResponse<CorrectionRequest[]> = await res.json();
      return json.data ?? [];
    },
  });

  // Derived data
  const weeklySummaries = data?.weeklySummaries ?? [];
  const currentWeekSummary = weeklySummaries.length > 0 ? weeklySummaries[0] : null;
  const dailyTarget = currentWeekSummary ? Math.round(currentWeekSummary.targetMinutes / 5) : 480;

  // Group entries by date
  const entriesByDate = new Map<string, TimeEntryWithNet[]>();
  if (data?.entries) {
    for (const entry of data.entries) {
      const existing = entriesByDate.get(entry.date) ?? [];
      existing.push(entry);
      entriesByDate.set(entry.date, existing);
    }
  }

  // Calculate per-day dates for the week
  const weekDays = getWeekDays(start);

  // Week label
  const weekLabel = (() => {
    if (weekOffset === 0) return "Diese Woche";
    if (weekOffset === -1) return "Letzte Woche";
    if (weekOffset === 1) return "Nächste Woche";
    const s = formatShortDate(start);
    const e = formatShortDate(end);
    return `${s} – ${e}`;
  })();

  return (
    <TooltipProvider>
      <div>
        {/* ---- Header with week navigation ---- */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Meine Zeiten
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Übersicht deiner Arbeitszeiten
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7"
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* ---- Week Summary Cards ---- */}
        {data && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Week balance */}
            <Card className="shadow-sm">
              <CardContent className="py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Wochenbilanz
                </p>
                <p className={`text-xl font-mono font-bold tabular-nums ${
                  currentWeekSummary && currentWeekSummary.overtimeMinutes > 0
                    ? "text-emerald-600"
                    : currentWeekSummary && currentWeekSummary.overtimeMinutes < 0
                      ? "text-foreground"
                      : "text-foreground"
                }`}>
                  {currentWeekSummary
                    ? formatBalance(currentWeekSummary.overtimeMinutes)
                    : "—"
                  }
                </p>
                {currentWeekSummary && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDurationCompact(currentWeekSummary.workedMinutes)} von {formatDurationCompact(currentWeekSummary.targetMinutes)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cumulative overtime (from all fetched weeks) */}
            <Card className="shadow-sm">
              <CardContent className="py-3">
                <div className="flex items-center gap-1 mb-1">
                  {data.cumulativeOvertimeMinutes > 0 ? (
                    <TrendingUp className="size-3 text-emerald-500" />
                  ) : data.cumulativeOvertimeMinutes < 0 ? (
                    <TrendingDown className="size-3 text-amber-500" />
                  ) : (
                    <Minus className="size-3 text-muted-foreground" />
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Gesamtüberstunden
                  </p>
                </div>
                <p className={`text-xl font-mono font-bold tabular-nums ${
                  data.cumulativeOvertimeMinutes > 0
                    ? "text-emerald-600"
                    : data.cumulativeOvertimeMinutes < 0
                      ? "text-amber-600"
                      : "text-foreground"
                }`}>
                  {formatBalance(data.cumulativeOvertimeMinutes)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Correction dialog */}
        {correctionEntry && (
          <CorrectionRequestDialog
            entry={correctionEntry}
            open={!!correctionEntry}
            onClose={() => setCorrectionEntry(null)}
            onSubmitted={() => {
              setCorrectionEntry(null);
              refetch();
              refetchCorrections();
            }}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {/* Empty state */}
        {data && data.entries.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Clock className="size-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Keine Zeiteinträge für diese Woche.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ---- Day-grouped entries ---- */}
        {data && data.entries.length > 0 && (
          <div className="space-y-4">
            {weekDays.map((date) => {
              const entries = entriesByDate.get(date);
              if (!entries || entries.length === 0) return null;

              return (
                <DayEntryCard
                  key={date}
                  date={date}
                  entries={entries}
                  corrections={corrections}
                  dailyTarget={dailyTarget}
                  onRequestCorrection={setCorrectionEntry}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Activity Grid at the bottom ---- */}
      <Card className="shadow-sm mt-8">
        <CardContent className="py-4">
          <ActivityGrid
            activities={activityMap}
            dailyTargetMinutes={dailyTarget}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
