/**
 * GET /api/v1/presence
 *
 * Presence board data — visible to ALL authenticated roles.
 * Returns each active employee's current presence status
 * (running / paused / off) plus their clock-in time and today's net minutes.
 *
 * Unlike the manager dashboard, this does NOT expose compliance warnings
 * for other people (DSGVO: colleagues see presence, not each other's
 * ArbZG violation flags).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getTeamStatus } from "@/repos/dashboardRepo";
import type { ApiResponse } from "@/types/api";

/** Public presence status for a single team member. */
export interface PresenceMember {
  employeeId: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "employee";
  status: "running" | "paused" | "off";
  /** ISO timestamp of the active entry's clock_in, or null when off. */
  since: string | null;
  todayNetMinutes: number;
}

export interface PresenceResponse {
  /** Current user's employee id (so the UI can highlight "me"). */
  meId: string;
  members: PresenceMember[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<PresenceResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const todayDate = getTodayDate();
    const teamStatus = await getTeamStatus(supabase, tenantId, todayDate);

    const members: PresenceMember[] = teamStatus.map((m) => ({
      employeeId: m.employee.id,
      firstName: m.employee.first_name,
      lastName: m.employee.last_name,
      role: m.employee.role,
      status:
        m.activeEntry?.status === "paused"
          ? "paused"
          : m.activeEntry?.status === "running"
            ? "running"
            : "off",
      since: m.activeEntry?.clock_in ?? null,
      todayNetMinutes: m.todayNetMinutes,
    }));

    return NextResponse.json<ApiResponse<PresenceResponse>>(
      { data: { meId: employeeId, members }, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Presence error:", error);
    return NextResponse.json<ApiResponse<PresenceResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
