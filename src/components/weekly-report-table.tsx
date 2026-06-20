/**
 * Weekly Report Table — Per-employee, per-day breakdown for managers.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { getWeekMondayForOffset, epochToDate, getCurrentEpochDays, getDayOfWeekFromEpoch } from "@/config/client/date-utils";
import { EmployeeEntryList } from "@/components/employee-entry-list";
import { ExportButtons } from "@/components/export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DayCell {
  date: string;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  netMinutes: number | null;
}

interface EmployeeWeekRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  bundesland: string | null;
  targetHoursWeek: number;
  days: DayCell[];
  totalNetMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
}

interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  employees: EmployeeWeekRow[];
}

/** Format minutes to "H:MM". */
function formatHours(minutes: number | null): string {
  if (minutes === null) return "–";
  if (minutes === -1) return "F"; // Holiday
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/** Format overtime minutes. */
function formatOvertime(minutes: number): string {
  if (minutes === 0) return "±0:00";
  const sign = minutes > 0 ? "+" : "";
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = Math.round(absMin % 60);
  return `${sign}${minutes > 0 ? "" : "-"}${h}:${m.toString().padStart(2, "0")}`;
}

/** Format date as DD.MM. */
function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

interface DrillDown {
  employeeId: string;
  employeeName: string;
}

export function WeeklyReportTable() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const weekStart = getWeekMondayForOffset(weekOffset);
  // Calculate Sunday from Monday using epoch math
  const weekEnd = (() => {
    const epoch = getCurrentEpochDays();
    const dow = getDayOfWeekFromEpoch(epoch);
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const mondayEpoch = epoch + mondayOffset + weekOffset * 7;
    return epochToDate(mondayEpoch + 6);
  })();

  const { data, isLoading } = useQuery<WeeklyReportData>({
    queryKey: ["weeklyReport", weekStart],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/reports/weekly?weekStart=${weekStart}`,
      );
      const json: ApiResponse<WeeklyReportData> = await res.json();
      return json.data!;
    },
  });

  // Get all day columns (Mon-Sun)
  const weekDays = data?.employees?.[0]?.days ?? [];

  // Drill-down view for a single employee
  if (drillDown) {
    return (
      <EmployeeEntryList
        employeeId={drillDown.employeeId}
        employeeName={drillDown.employeeName}
        startDate={weekStart}
        endDate={weekEnd}
        onBack={() => setDrillDown(null)}
      />
    );
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Wochenbericht</h2>
          {data && (
            <p className="text-sm text-muted-foreground">
              {formatDate(data.weekStart)} – {formatDate(data.weekEnd)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            ← Vorwoche
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Aktuelle Woche
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={weekOffset >= 0}
          >
            Nächste →
          </Button>
          {data && (
            <ExportButtons
              weekStart={data.weekStart}
              weekEnd={data.weekEnd}
            />
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {data && data.employees.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Keine Mitarbeiter vorhanden.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.employees.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2 font-medium">Mitarbeiter</th>
                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`text-center px-3 py-2 font-medium ${
                      day.isHoliday ? "text-amber-600" : day.isWeekend ? "text-muted-foreground" : ""
                    }`}
                  >
                    <div>{day.dayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(day.date)}
                    </div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium">Gesamt</th>
                <th className="text-center px-3 py-2 font-medium">Soll</th>
                <th className="text-center px-3 py-2 font-medium">Überstd.</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp) => (
                <tr
                  key={emp.employeeId}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2 font-medium">
                    <button
                      onClick={() =>
                        setDrillDown({
                          employeeId: emp.employeeId,
                          employeeName: `${emp.firstName} ${emp.lastName}`,
                        })
                      }
                      className="text-left hover:text-primary hover:underline transition-colors"
                    >
                      {emp.firstName} {emp.lastName}
                    </button>
                  </td>
                  {emp.days.map((day) => (
                      <td
                        key={day.date}
                        className={`text-center px-3 py-2 ${
                          day.isHoliday
                            ? "text-amber-600 font-medium"
                            : day.isWeekend
                              ? day.netMinutes !== null
                                ? "text-muted-foreground"
                                : "text-muted-foreground/40"
                              : day.netMinutes === null
                                ? "text-muted-foreground"
                                : ""
                        }`}
                        title={
                          day.isHoliday
                            ? day.holidayName ?? "Feiertag"
                            : day.netMinutes === null
                              ? "Kein Eintrag"
                              : undefined
                        }
                      >
                        {formatHours(day.netMinutes)}
                      </td>
                    ))}
                  <td className="text-center px-3 py-2 font-medium">
                    {formatHours(emp.totalNetMinutes)}
                  </td>
                  <td className="text-center px-3 py-2 text-muted-foreground">
                    {formatHours(emp.targetMinutes)}
                  </td>
                  <td
                    className={`text-center px-3 py-2 font-medium ${
                      emp.overtimeMinutes > 0
                        ? "text-green-600"
                        : emp.overtimeMinutes < 0
                          ? "text-red-600"
                          : ""
                    }`}
                  >
                    {formatOvertime(emp.overtimeMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
