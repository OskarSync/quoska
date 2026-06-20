/**
 * GET /api/v1/employees/me
 *
 * Returns the current authenticated employee's profile including role.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { employeeId } = authResult.data;

    const { data: employee } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, target_hours_week, bundesland")
      .eq("id", employeeId)
      .single();

    if (!employee) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Mitarbeiter nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { data: employee, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get current employee error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
