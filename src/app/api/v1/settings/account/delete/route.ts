/**
 * POST /api/v1/settings/account/delete
 *
 * DSGVO — Request account deletion with 14-day waiting period.
 * Admin only. Requires password confirmation.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { accountDeletionSchema } from "@/types/export";
import { calculateDeletionDate } from "@/services/accountDeletionService";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";

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

    const { tenantId, role } = authResult.data;

    if (role !== "admin") {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Keine Berechtigung." },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = accountDeletionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Passwort ist erforderlich." },
        { status: 400 },
      );
    }

    // Verify password by re-authenticating
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    // Verify password via signIn
    const supabaseForAuth = await createClient();
    const { error: signInError } =
      await supabaseForAuth.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.password,
      });

    if (signInError) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Passwort ist falsch." },
        { status: 401 },
      );
    }

    // Calculate deletion date
    const nowIso = getNowIso();
    const deletionDate = calculateDeletionDate(nowIso);

    // Store deletion request as a notification
    await supabase.from("notifications").insert({
      tenant_id: tenantId,
      employee_id: authResult.data.employeeId,
      type: "account_deletion_request",
      title: "Account-Löschung angefordert",
      message: `Dein Account und alle Daten werden am ${deletionDate.split("-").reverse().join(".")} gelöscht.`,
      read: false,
    });

    return NextResponse.json<
      ApiResponse<{ deletionDate: string; message: string }>
    >(
      {
        data: {
          deletionDate,
          message: `Dein Account wird am ${deletionDate.split("-").reverse().join(".")} gelöscht. Du erhältst 7 Tage vorher eine letzte Warnung.`,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Account deletion request error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
