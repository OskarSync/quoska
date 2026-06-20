import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, setupComplete } = body;

    if (!tenantId || typeof setupComplete !== "boolean") {
      return NextResponse.json(
        { data: null, error: "tenantId und setupComplete sind erforderlich" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("tenants")
      .update({ setup_complete: setupComplete })
      .eq("id", tenantId);

    if (error) {
      return NextResponse.json(
        { data: null, error: "Fehler beim Abschließen der Einrichtung" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { success: true }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Unerwarteter Fehler" },
      { status: 500 },
    );
  }
}
