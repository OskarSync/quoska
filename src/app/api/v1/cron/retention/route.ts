/**
 * POST /api/v1/cron/retention
 *
 * Cron job: Soft-delete time entries older than 2 years (§16 Abs. 2 ArbZG).
 * Audit records are preserved.
 *
 * Should be called daily. Protected by a CRON_SECRET.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { runRetentionForTenant } from "@/services/retentionService";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Nicht autorisiert." },
        { status: 401 },
      );
    }

    const supabase = await createClient();
    const nowIso = getNowIso();

    // Get all tenants
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id");

    if (!tenants || tenants.length === 0) {
      return NextResponse.json<
        ApiResponse<{ tenantsProcessed: number; totalDeleted: number }>
      >(
        { data: { tenantsProcessed: 0, totalDeleted: 0 }, error: null },
        { status: 200 },
      );
    }

    let totalDeleted = 0;

    for (const tenant of tenants) {
      const deleted = await runRetentionForTenant(
        supabase,
        tenant.id,
        nowIso,
      );
      totalDeleted += deleted;
    }

    return NextResponse.json<
      ApiResponse<{
        tenantsProcessed: number;
        totalDeleted: number;
        cutoffDate: string;
      }>
    >(
      {
        data: {
          tenantsProcessed: tenants.length,
          totalDeleted,
          cutoffDate: nowIso.slice(0, 10),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Retention cron error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
