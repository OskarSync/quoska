/**
 * Absence Calendar — Monthly calendar showing team absences.
 * Uses shadcn Calendar (react-day-picker) with German locale.
 *
 * Note: react-day-picker v10 only renders DayButton when the calendar is
 * "interactive" (has mode or onDayClick). Since this is a display-only
 * calendar, we override the Day component (the <td> cell) instead.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { de } from "date-fns/locale/de";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { ApiResponse } from "@/types/api";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AbsenceEntry {
  date: string;
  employee_id: string;
  employee_name?: string;
  type: "vacation" | "sick";
}

export function AbsenceCalendar() {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar
  const [month, setMonth] = useState<Date>(new Date());

  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

  const { data: absences, isLoading } = useQuery<AbsenceEntry[]>({
    queryKey: ["absenceCalendar", monthStart, monthEnd],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/absence-calendar?start_date=${monthStart}&end_date=${monthEnd}`,
      );
      const json: ApiResponse<AbsenceEntry[]> = await res.json();
      return json.data ?? [];
    },
  });

  // Group absences by date
  const byDate = new Map<string, { vacation: boolean; sick: boolean }>();
  for (const a of absences ?? []) {
    const existing = byDate.get(a.date) ?? { vacation: false, sick: false };
    if (a.type === "vacation") existing.vacation = true;
    if (a.type === "sick") existing.sick = true;
    byDate.set(a.date, existing);
  }

  // Dates with absences for the calendar modifiers
  const vacationDates = (absences ?? [])
    .filter((a) => a.type === "vacation")
    // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar widget
    .map((a) => new Date(a.date + "T12:00:00"));
  const sickDates = (absences ?? [])
    .filter((a) => a.type === "sick")
    // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar widget
    .map((a) => new Date(a.date + "T12:00:00"));

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="space-y-3">
            <Calendar
              locale={de}
              month={month}
              onMonthChange={setMonth}
              modifiers={{
                vacation: vacationDates,
                sick: sickDates,
              }}
              modifiersClassNames={{
                vacation: "",
                sick: "",
              }}
              className="w-full rounded-lg border-0 [--cell-size:--spacing(8)] [--cell-radius:0.25rem]"
              classNames={{
                root: "w-full",
                months: "gap-0",
                month: "gap-0",
                month_caption: "flex h-8 w-full items-center justify-center px-(--cell-size)",
                button_previous: "size-8 p-0 select-none aria-disabled:opacity-50",
                button_next: "size-8 p-0 select-none aria-disabled:opacity-50",
                month_grid: "w-full border-separate border-spacing-y-0",
                weekdays: "flex w-full",
                weekday:
                  "flex-1 text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground/60 select-none",
                week: "flex w-full mt-0",
                day: "group/day relative h-18 w-full rounded-(--cell-radius) p-0 text-center select-none",
              }}
              components={{
                // Override Day (the <td> cell) instead of DayButton, because
                // DayButton only renders in interactive mode (mode/onDayClick set).
                Day: ({
                  day,
                  modifiers,
                  className: dayClassName,
                  ...tdProps
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }: any) => (
                  <AbsenceDayCell
                    day={day}
                    modifiers={modifiers}
                    dateInfo={byDate.get(
                      format(day.date, "yyyy-MM-dd"),
                    )}
                    className={dayClassName}
                    {...tdProps}
                  />
                ),
              }}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-4 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">
                  Urlaub
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-4 rounded-full bg-rose-400" />
                <span className="text-xs font-medium text-muted-foreground">
                  Krank
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Custom Day cell that renders absence indicator bars.
 * Overrides the react-day-picker Day component (renders <td>).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AbsenceDayCell({ day, dateInfo, className: dayClassName, ...tdProps }: any) {
  const dateStr = format(day.date, "yyyy-MM-dd");
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only comparison
  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const hasAbsence = dateInfo && (dateInfo.vacation || dateInfo.sick);
  const both = dateInfo?.vacation && dateInfo?.sick;

  return (
    <td
      {...tdProps}
      className={`${dayClassName || ""} ${
        isToday
          ? "font-bold rounded-(--cell-radius) bg-violet-100/80 text-violet-700 ring-1 ring-violet-300/60 shadow-sm"
          : ""
      } ${hasAbsence ? "rounded-(--cell-radius)" : ""}`}
    >
      <div className="relative flex items-center justify-center h-full w-full transition-colors duration-150 hover:bg-muted/50 rounded-(--cell-radius)">
        <span className="text-sm font-medium tabular-nums leading-none">
          {day.date.getDate()}
        </span>
        {hasAbsence && (
          <span
            className={`absolute bottom-1 h-[3px] w-3/4 rounded-full ${
              both
                ? "bg-gradient-to-r from-emerald-400 to-rose-400"
                : dateInfo.vacation
                  ? "bg-emerald-400"
                  : "bg-rose-400"
            }`}
          />
        )}
      </div>
    </td>
  );
}
