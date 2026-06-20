/**
 * GET /api/v1/my-times?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Employee self-service: time entries with overtime calculation
 * for a given date range. Holiday-aware target hours.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getTimeEntriesByDateRange, getActiveEntry } from "@/repos/timeEntryRepo";
import { getHolidayDatesInRange } from "@/repos/holidayRepo";
import {
  calculateWeekTargetHours,
  getWeekMonday,
  getWeekSunday,
  holidaysToMap,
} from "@/services/holidayService";
import {
  netMinutesForEntry,
  netMinutesForRunningEntry,
  formatOvertime,
} from "@/services/overtimeService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import type { PublicHoliday } from "@/types/database";
import { weekQuerySchema } from "@/types/holiday";

export interface TimeEntryWithNet extends TimeEntry {
  netMinutes: number;
}

export interface WeekOvertimeSummary {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
  overtimeDisplay: string;
}

export interface MyTimesResponse {
  entries: TimeEntryWithNet[];
  weeklySummaries: WeekOvertimeSummary[];
  cumulativeOvertimeMinutes: number;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: "startDate und endDate sind erforderlich." },
        { status: 400 },
      );
    }

    const parsed = weekQuerySchema.safeParse({
      weekStart: startDate,
      weekEnd: endDate,
    });
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: "Ungültiges Datumsformat." },
        { status: 400 },
      );
    }

    const nowIso = getNowIso();

    // Get employee config
    const { data: employee } = await supabase
      .from("employees")
      .select("bundesland, target_hours_week")
      .eq("id", employeeId)
      .is("deleted_at", null)
      .single();

    const bundesland = employee?.bundesland ?? "berlin";
    const targetHoursWeek = employee?.target_hours_week ?? 40;

    // Fetch data in parallel
    const [entries, activeEntry, holidayMap] = await Promise.all([
      getTimeEntriesByDateRange(supabase, tenantId, employeeId, startDate, endDate),
      getActiveEntry(supabase, tenantId, employeeId),
      getHolidayDatesInRange(supabase, bundesland, startDate, endDate),
    ]);

    // Add net minutes to each entry
    const entriesWithNet: TimeEntryWithNet[] = entries.map((entry) => ({
      ...entry,
      netMinutes: entry.clock_out
        ? netMinutesForEntry(entry)
        : netMinutesForRunningEntry(entry, nowIso),
    }));

    // Group entries by week and calculate overtime per week
    const weekGroups = groupEntriesByWeek(entries, activeEntry);
    const weeklySummaries: WeekOvertimeSummary[] = [];

    for (const [weekMonday, weekEntries] of weekGroups) {
      const weekSunday = getWeekSunday(weekMonday);
      const holidays = filterHolidaysForWeek(holidayMap, weekMonday, weekSunday);
      const holidayMapObj = holidaysToMap(holidays);
      const weekTarget = calculateWeekTargetHours(
        weekMonday,
        holidayMapObj,
        targetHoursWeek,
      );

      let workedMinutes = weekEntries
        .filter((e) => e.status === "completed" && e.clock_out)
        .reduce((sum, e) => sum + netMinutesForEntry(e), 0);

      if (
        activeEntry &&
        getWeekMonday(activeEntry.date) === weekMonday
      ) {
        workedMinutes += netMinutesForRunningEntry(activeEntry, nowIso);
      }

      const targetMin = weekTarget.weekTarget * 60;
      const overtime = workedMinutes - targetMin;

      weeklySummaries.push({
        weekStart: weekMonday,
        weekEnd: weekSunday,
        workedMinutes,
        targetMinutes: targetMin,
        overtimeMinutes: overtime,
        overtimeDisplay: formatOvertime(overtime),
      });
    }

    const cumulativeOvertimeMinutes = weeklySummaries.reduce(
      (sum, w) => sum + w.overtimeMinutes,
      0,
    );

    const response: MyTimesResponse = {
      entries: entriesWithNet,
      weeklySummaries,
      cumulativeOvertimeMinutes,
    };

    return NextResponse.json<ApiResponse<MyTimesResponse>>(
      { data: response, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("My times error:", error);
    return NextResponse.json<ApiResponse<MyTimesResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/** Group entries by ISO week (Monday key). */
function groupEntriesByWeek(
  entries: TimeEntry[],
  activeEntry: TimeEntry | null,
): Map<string, TimeEntry[]> {
  const weekMap = new Map<string, TimeEntry[]>();

  for (const entry of entries) {
    const key = getWeekMonday(entry.date);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(entry);
  }

  if (activeEntry) {
    const key = getWeekMonday(activeEntry.date);
    if (!weekMap.has(key)) weekMap.set(key, []);
  }

  return weekMap;
}

/** Convert holiday map entries to PublicHoliday-like objects for a week range. */
function filterHolidaysForWeek(
  holidayMap: Map<string, string>,
  weekStart: string,
  weekEnd: string,
): PublicHoliday[] {
  const result: PublicHoliday[] = [];
  for (const [date, name] of holidayMap) {
    if (date >= weekStart && date <= weekEnd) {
      result.push({
        id: "",
        date,
        name,
        bundesland: "",
        created_at: "",
      });
    }
  }
  return result;
}
