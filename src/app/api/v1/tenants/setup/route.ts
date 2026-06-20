import { z } from "zod";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { setupCompanySchema } from "@/types/setup";
import { BUNDESLAENDER } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { data: null, error: "userId ist erforderlich" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: employee } = await admin
    .from("employees")
    .select("tenant_id, tenants(id, setup_complete)")
    .eq("user_id", userId)
    .single();

  if (!employee) {
    return NextResponse.json(
      { data: null, error: "Mitarbeiter nicht gefunden" },
      { status: 404 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = employee.tenants as any;

  return NextResponse.json({
    data: {
      tenantId: employee.tenant_id,
      setupComplete: tenant?.setup_complete ?? false,
    },
    error: null,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = setupCompanySchema.parse(body);

    // Validate bundesland
    if (
      !BUNDESLAENDER.includes(input.bundesland as (typeof BUNDESLAENDER)[number])
    ) {
      return NextResponse.json(
        { data: null, error: "Ungültiges Bundesland" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Get tenant_id from the employee record linked to this user
    const { data: employee } = await admin
      .from("employees")
      .select("tenant_id")
      .eq("user_id", body.userId)
      .single();

    if (!employee) {
      return NextResponse.json(
        { data: null, error: "Mitarbeiter nicht gefunden" },
        { status: 404 },
      );
    }

    // Update tenant with company details
    const { error } = await admin
      .from("tenants")
      .update({
        name: input.companyName,
        bundesland: input.bundesland,
      })
      .eq("id", employee.tenant_id);

    if (error) {
      return NextResponse.json(
        { data: null, error: "Fehler beim Speichern der Firmendaten" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: { tenantId: employee.tenant_id },
      error: null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: err.errors[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { data: null, error: "Unerwarteter Fehler" },
      { status: 500 },
    );
  }
}
