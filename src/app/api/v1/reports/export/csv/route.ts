/**
 * GET /api/v1/reports/export/csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&employeeId=UUID
 *
 * Manager CSV export of time entries for a date range.
 * Returns CSV file with German headers and formatting.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getEntriesForExport } from "@/repos/exportRepo";
import { entriesToExportRows, generateCSV, csvFilename } from "@/services/exportService";
import { exportQuerySchema } from "@/types/export";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role === "employee") {
      return NextResponse.json(
        { data: null, error: "Keine Berechtigung." },
        { status: 403 },
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const parsed = exportQuerySchema.safeParse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      employeeId: searchParams.get("employeeId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: "Ungültige Parameter. startDate und endDate (YYYY-MM-DD) erforderlich." },
        { status: 400 },
      );
    }

    const { startDate, endDate, employeeId } = parsed.data;

    // Fetch entries
    const rawEntries = await getEntriesForExport(
      supabase,
      tenantId,
      startDate,
      endDate,
      employeeId,
    );

    // Convert to export rows
    const exportRows = entriesToExportRows(rawEntries);

    // Generate CSV
    const csv = generateCSV(exportRows);
    const filename = csvFilename(startDate, endDate);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
