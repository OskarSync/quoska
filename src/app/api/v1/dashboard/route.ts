/**
 * GET /api/v1/dashboard
 *
 * Manager dashboard data: team status, compliance alerts, missing entries.
 * Only accessible to admin/manager roles.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso, getTodayDate, getWeekBounds } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getTeamStatus, getMissingEntries } from "@/repos/dashboardRepo";
import { getHolidayDatesInRange } from "@/repos/holidayRepo";
import { getFullComplianceStatus } from "@/services/complianceService";
import { getWeekEntries, getLatestCompletedEntry } from "@/repos/timeEntryRepo";
import { holidaysToSet } from "@/services/holidayService";
import type { ApiResponse } from "@/types/api";
import type { ComplianceWarning } from "@/types/compliance";

/** Team member status for API response. */
interface TeamMemberApiStatus {
  employeeId: string;
  firstName: string;
  lastName: string;
  bundesland: string | null;
  status: "running" | "paused" | "off";
  since: string | null;
  todayNetMinutes: number;
  warnings: ComplianceWarning[];
}

/** Missing entry for API response. */
interface MissingEntryApi {
  employeeId: string;
  employeeName: string;
  date: string;
}

export interface DashboardResponse {
  teamStatus: TeamMemberApiStatus[];
  complianceAlerts: ComplianceWarning[];
  missingEntries: MissingEntryApi[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<DashboardResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role === "employee") {
      return NextResponse.json<ApiResponse<DashboardResponse>>(
        { data: null, error: "Keine Berechtigung für diese Ansicht." },
        { status: 403 },
      );
    }

    const todayDate = getTodayDate();
    const { weekStart, weekEnd } = getWeekBounds();
    const nowIso = getNowIso();

    // Fetch team status
    const teamStatus = await getTeamStatus(supabase, tenantId, todayDate);

    // Build API response with compliance warnings per employee
    const teamApi: TeamMemberApiStatus[] = [];
    const allWarnings: ComplianceWarning[] = [];

    for (const member of teamStatus) {
      const { employee, activeEntry, todayNetMinutes } = member;

      // Get compliance warnings for this employee
      let warnings: ComplianceWarning[] = [];
      if (activeEntry) {
        const weekEntries = await getWeekEntries(
          supabase,
          tenantId,
          employee.id,
          weekStart,
          weekEnd,
        );
        const lastCompleted = await getLatestCompletedEntry(
          supabase,
          tenantId,
          employee.id,
        );

        const compliance = getFullComplianceStatus({
          activeEntry,
          weekEntries,
          lastCompletedEntry: lastCompleted,
          nowIso,
        });
        warnings = compliance.warnings;
        allWarnings.push(...warnings);
      }

      teamApi.push({
        employeeId: employee.id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        bundesland: employee.bundesland,
        status: activeEntry?.status === "paused"
          ? "paused"
          : activeEntry?.status === "running"
            ? "running"
            : "off",
        since: activeEntry?.clock_in ?? null,
        todayNetMinutes,
        warnings,
      });
    }

    // Fetch missing entries for the current work week
    // Use tenant's bundesland if set, otherwise 'berlin' as default
    const { data: tenant } = await supabase
      .from("tenants")
      .select("bundesland")
      .eq("id", tenantId)
      .single();

    const bundesland = tenant?.bundesland ?? "berlin";
    const holidayMap = await getHolidayDatesInRange(
      supabase,
      bundesland,
      weekStart,
      weekEnd,
    );
    const holidaySet = holidaysToSet(
      Array.from(holidayMap.entries()).map(([date, name]) => ({
        id: "",
        date,
        name,
        bundesland,
        created_at: "",
      })),
    );

    const missingRaw = await getMissingEntries(
      supabase,
      tenantId,
      weekStart,
      todayDate,
      holidaySet,
    );

    const missingEntries: MissingEntryApi[] = missingRaw.map((m) => ({
      employeeId: m.employeeId,
      employeeName: `${m.employeeFirstName} ${m.employeeLastName}`,
      date: m.date,
    }));

    const response: DashboardResponse = {
      teamStatus: teamApi,
      complianceAlerts: allWarnings,
      missingEntries,
    };

    return NextResponse.json<ApiResponse<DashboardResponse>>(
      { data: response, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json<ApiResponse<DashboardResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
