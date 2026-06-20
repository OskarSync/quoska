/**
 * GET /api/v1/notifications — List notifications for current user.
 * POST /api/v1/notifications — Mark all as read (body: { action: 'read_all' }).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import {
  listNotifications,
  markAllNotificationsRead,
  getUnreadCount,
} from "@/services/notificationService";
import { notificationListSchema, readAllSchema } from "@/types/notification";
import type { ApiResponse } from "@/types/api";
import type { Notification } from "@/types/database";

/**
 * GET — List notifications for current user.
 * Query params: limit (default 50), unread_only (default false).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Notification[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Parse query params
    const url = new URL(request.url);
    const parsed = notificationListSchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<Notification[]>>(
        { data: null, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    // Special case: if limit=0 and unread_only=true, just return count
    if (parsed.data.limit === 0 && parsed.data.unread_only) {
      const count = await getUnreadCount(supabase, tenantId, employeeId);
      return NextResponse.json<ApiResponse<{ count: number }>>(
        { data: { count }, error: null },
        { status: 200 },
      );
    }

    const result = await listNotifications(supabase, tenantId, employeeId, {
      limit: parsed.data.limit,
      unreadOnly: parsed.data.unread_only,
    });

    return NextResponse.json<ApiResponse<Notification[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Notification list error:", error);
    return NextResponse.json<ApiResponse<Notification[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/**
 * POST — Mark all notifications as read.
 * Body: { action: 'read_all' }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const body: unknown = await request.json();
    const parsed = readAllSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await markAllNotificationsRead(
      supabase, tenantId, employeeId,
    );

    return NextResponse.json<ApiResponse<{ updated: number }>>(
      { data: { updated: result.data ?? 0 }, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
