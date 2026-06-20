/**
 * PATCH /api/v1/notifications/[id] — Mark a single notification as read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { markNotificationRead } from "@/services/notificationService";
import type { ApiResponse } from "@/types/api";
import type { Notification } from "@/types/database";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Notification>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;
    const { id } = await params;

    const result = await markNotificationRead(
      supabase, tenantId, id, employeeId,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<Notification>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<Notification>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json<ApiResponse<Notification>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
