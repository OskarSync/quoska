/**
 * GET /api/v1/clock/status
 *
 * Get the current clock status for the authenticated employee.
 * Returns: active entry, active break, compliance warnings, today & week summary,
 * and monthly carry-over (surplus/deficit from previous days this month).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso, getTodayDate, getWeekBounds, getMonthStart } from "@/config/server/timestamps";
import { getEmployeeFromAuth, getClockStatus } from "@/services/timeEntryService";
import { getActiveBreak } from "@/repos/breakSessionRepo";
import { getMonthEntriesBeforeToday } from "@/repos/timeEntryRepo";
import {
  getFullComplianceStatus,
  calculateNetWorkMinutes,
} from "@/services/complianceService";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";

export async function GET() {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<ClockStatusResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Calculate date boundaries
    const todayDate = getTodayDate();
    const { weekStart: weekStartStr, weekEnd: weekEndStr } = getWeekBounds();
    const monthStart = getMonthStart();

    // Get clock status
    const statusResult = await getClockStatus(
      supabase,
      tenantId,
      employeeId,
      todayDate,
      weekStartStr,
      weekEndStr,
    );

    if (!statusResult.data) {
      return NextResponse.json<ApiResponse<ClockStatusResponse>>(
        { data: null, error: statusResult.error },
        { status: 500 },
      );
    }

    const { activeEntry, todayEntries, weekEntries, lastCompletedEntry } =
      statusResult.data;

    // Get active break if entry is paused
    let activeBreak = null;
    if (activeEntry?.status === "paused") {
      activeBreak = await getActiveBreak(supabase, tenantId, activeEntry.id);
    }

    // Calculate compliance
    const nowIso = getNowIso();
    const compliance = getFullComplianceStatus({
      activeEntry,
      weekEntries,
      lastCompletedEntry,
      nowIso,
    });

    // Calculate today summary — sums ALL completed entries
    const todayCompletedEntries = todayEntries.filter(
      (e) => e.status === "completed",
    );
    let todaySummary = null;

    // Sum net minutes from all completed entries today
    const completedNetMinutes = todayCompletedEntries.reduce(
      (sum, e) => sum + calculateNetWorkMinutes(e.clock_in, e.clock_out, e.break_minutes, nowIso),
      0,
    );
    const completedBreakMinutes = todayCompletedEntries.reduce(
      (sum, e) => sum + (e.break_minutes ?? 0),
      0,
    );

    if (activeEntry || todayCompletedEntries.length > 0) {
      const earliestClockIn = activeEntry?.clock_in ?? todayCompletedEntries[0]?.clock_in;
      const latestClockOut = todayCompletedEntries.length > 0
        ? todayCompletedEntries[todayCompletedEntries.length - 1].clock_out
        : null;
      todaySummary = {
        clockIn: earliestClockIn,
        clockOut: activeEntry ? null : latestClockOut,
        breakMinutes: completedBreakMinutes,
        netMinutes: completedNetMinutes,
      };
    }

    // Calculate week summary
    const weekMinutes = weekEntries.reduce((sum, e) => {
      if (e.status === "completed" && e.clock_out) {
        return (
          sum +
          calculateNetWorkMinutes(e.clock_in, e.clock_out, e.break_minutes, nowIso)
        );
      }
      return sum;
    }, 0);

    // Add active entry's time to week total
    let activeWeekMinutes = weekMinutes;
    if (activeEntry) {
      activeWeekMinutes += calculateNetWorkMinutes(
        activeEntry.clock_in,
        null,
        activeEntry.break_minutes,
        nowIso,
      );
    }

    // Get employee's actual target hours (not hardcoded)
    const { data: empRecord } = await supabase
      .from("employees")
      .select("target_hours_week")
      .eq("id", employeeId)
      .single();
    const targetHoursWeek = empRecord?.target_hours_week ?? 40;
    const targetMinutes = targetHoursWeek * 60;

    // Calculate monthly carry-over: net minutes from previous days this month
    // minus the daily target for each of those days.
    // This represents how much surplus (+) or deficit (-) was accumulated before today.
    const dailyTargetMinutes = Math.round(targetMinutes / 5); // 480 for 40h week

    const monthEntriesBeforeToday = await getMonthEntriesBeforeToday(
      supabase,
      tenantId,
      employeeId,
      monthStart,
      todayDate,
    );

    // Group entries by date to calculate per-day net minutes
    const entriesByDate = new Map<string, number>();
    for (const entry of monthEntriesBeforeToday) {
      if (!entry.clock_out) continue;
      const net = calculateNetWorkMinutes(
        entry.clock_in,
        entry.clock_out,
        entry.break_minutes,
        nowIso,
      );
      const existing = entriesByDate.get(entry.date) ?? 0;
      entriesByDate.set(entry.date, existing + net);
    }

    // Sum up (worked - target) for each previous work day
    // Days with no entries count as 0 worked (full deficit)
    let monthCarryOverMinutes = 0;
    for (const [, dayNet] of entriesByDate) {
      monthCarryOverMinutes += dayNet - dailyTargetMinutes;
    }

    const response: ClockStatusResponse = {
      activeEntry,
      activeBreak,
      compliance,
      todaySummary,
      weekSummary: {
        totalMinutes: activeWeekMinutes,
        targetMinutes,
        overtimeMinutes: activeWeekMinutes - targetMinutes,
      },
      monthCarryOverMinutes,
    };

    return NextResponse.json<ApiResponse<ClockStatusResponse>>(
      { data: response, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Clock status error:", error);
    return NextResponse.json<ApiResponse<ClockStatusResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
