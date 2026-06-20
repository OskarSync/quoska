/**
 * GET /api/v1/reports/weekly?weekStart=YYYY-MM-DD
 *
 * Weekly report: per-employee, per-day breakdown with holiday awareness.
 * Manager/admin only.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getEmployeesByTenant } from "@/repos/employeeRepo";
import { getHolidaysInRange } from "@/repos/holidayRepo";
import { addDays, holidaysToMap, isWeekend } from "@/services/holidayService";
import { netMinutesForEntry, netMinutesForRunningEntry } from "@/services/overtimeService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import { z } from "zod";

/** Per-day cell in the weekly report. */
export interface DayCell {
  date: string;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  netMinutes: number | null; // null = no entry, -1 = holiday
}

/** Per-employee row in the weekly report. */
export interface EmployeeWeekRow {
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

export interface WeeklyReportResponse {
  weekStart: string;
  weekEnd: string;
  employees: EmployeeWeekRow[];
}

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Get day of week from YYYY-MM-DD without new Date(). */
function getDayOfWeek(dateStr: string): number {
  const ms = Date.parse(dateStr + "T12:00:00Z");
  if (isNaN(ms)) return 0;
  const daysSinceEpoch = Math.floor(ms / 86_400_000);
  return (daysSinceEpoch + 4) % 7;
}

const querySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role === "employee") {
      return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
        { data: null, error: "Keine Berechtigung." },
        { status: 403 },
      );
    }

    // Parse weekStart
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");

    if (!weekStartParam) {
      return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
        { data: null, error: "weekStart ist erforderlich." },
        { status: 400 },
      );
    }

    const parsed = querySchema.safeParse({ weekStart: weekStartParam });
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
        { data: null, error: "Ungültiges Datumsformat." },
        { status: 400 },
      );
    }

    const weekStart = weekStartParam;
    const weekEnd = addDays(weekStart, 6);
    const nowIso = getNowIso();

    // Fetch employees
    const employees = await getEmployeesByTenant(supabase, tenantId);

    // Fetch all time entries for the tenant in this week
    const { data: rawEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .is("deleted_at", null);

    const entries = (rawEntries ?? []) as TimeEntry[];

    // Build employee rows
    const employeeRows: EmployeeWeekRow[] = [];

    for (const emp of employees) {
      // Get holidays for employee's bundesland
      const empBundesland = emp.bundesland ?? "berlin";
      const holidays = await getHolidaysInRange(
        supabase,
        empBundesland,
        weekStart,
        weekEnd,
      );
      const holidayMap = holidaysToMap(holidays);

      // Get entries for this employee
      const empEntries = entries.filter(
        (e) => e.employee_id === emp.id,
      );

      // Build day cells
      const days: DayCell[] = [];
      let totalNet = 0;
      let workingDays = 0;

      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const weekend = isWeekend(date);
        const holiday = holidayMap.has(date);
        const holidayName = holidayMap.get(date) ?? null;
        const dayOfWeek = getDayOfWeek(date);

        if (!weekend && !holiday) workingDays++;

        // Find entries for this day
        const dayEntries = empEntries.filter((e) => e.date === date);

        if (weekend) {
          // Count weekend entries if someone worked
          const dayEntries = empEntries.filter((e) => e.date === date);
          let weekendNet = 0;
          let hasWeekendEntries = false;
          for (const entry of dayEntries) {
            hasWeekendEntries = true;
            if (entry.clock_out) {
              weekendNet += netMinutesForEntry(entry);
            } else if (entry.status === "running") {
              weekendNet += netMinutesForRunningEntry(entry, nowIso);
            }
          }
          totalNet += weekendNet;

          days.push({
            date,
            dayName: DAY_NAMES[dayOfWeek],
            isWeekend: true,
            isHoliday: false,
            holidayName: null,
            netMinutes: hasWeekendEntries ? weekendNet : null,
          });
          continue;
        }

        if (holiday) {
          days.push({
            date,
            dayName: DAY_NAMES[dayOfWeek],
            isWeekend: false,
            isHoliday: true,
            holidayName,
            netMinutes: -1, // Holiday marker
          });
          continue;
        }

        // Calculate net minutes for the day
        let dayNet = 0;
        let hasEntries = false;

        for (const entry of dayEntries) {
          hasEntries = true;
          if (entry.clock_out) {
            dayNet += netMinutesForEntry(entry);
          } else if (entry.status === "running") {
            dayNet += netMinutesForRunningEntry(entry, nowIso);
          }
        }

        totalNet += dayNet;

        days.push({
          date,
          dayName: DAY_NAMES[dayOfWeek],
          isWeekend: false,
          isHoliday: false,
          holidayName: null,
          netMinutes: hasEntries ? dayNet : null,
        });
      }

      const dailyTarget = emp.target_hours_week / 5;
      const targetMinutes = workingDays * dailyTarget * 60;

      employeeRows.push({
        employeeId: emp.id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        bundesland: emp.bundesland,
        targetHoursWeek: emp.target_hours_week,
        days,
        totalNetMinutes: totalNet,
        targetMinutes,
        overtimeMinutes: totalNet - targetMinutes,
      });
    }

    const response: WeeklyReportResponse = {
      weekStart,
      weekEnd,
      employees: employeeRows,
    };

    return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
      { data: response, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json<ApiResponse<WeeklyReportResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
