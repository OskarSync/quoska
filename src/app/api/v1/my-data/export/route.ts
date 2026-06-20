/**
 * GET /api/v1/my-data/export
 *
 * DSGVO Art 20 — Employee data portability.
 * Exports all personal data as CSV: profile, time entries, audit records.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import {
  getEmployeeProfile,
  getEmployeeAllEntries,
  getEmployeeAuditRecords,
} from "@/repos/exportRepo";
import { buildEmployeeExport, generateDSGVOCSV } from "@/services/exportService";

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Fetch all data in parallel
    const [employee, allEntries, auditRecords] = await Promise.all([
      getEmployeeProfile(supabase, tenantId, employeeId),
      getEmployeeAllEntries(supabase, tenantId, employeeId),
      getEmployeeAuditRecords(supabase, tenantId, employeeId),
    ]);

    if (!employee) {
      return NextResponse.json(
        { data: null, error: "Mitarbeiterprofil nicht gefunden." },
        { status: 404 },
      );
    }

    // Build export data
    const exportData = buildEmployeeExport(
      employee,
      allEntries,
      auditRecords,
    );

    // Generate CSV
    const csv = generateDSGVOCSV(exportData);
    const filename = `quoska_meine_daten_${employee.first_name.toLowerCase()}_${employee.last_name.toLowerCase()}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("DSGVO export error:", error);
    return NextResponse.json(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
