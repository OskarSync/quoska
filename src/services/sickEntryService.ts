/**
 * Sick Entry Service — Business logic for sick day tracking (Epic 10).
 *
 * Handles:
 * - Create sick entries (employee or manager)
 * - Update sick entries (add end date, notes)
 * - AU certificate upload
 * - List sick entries (role-filtered)
 * - Entgeltfortzahlung tracking (42-day period)
 *
 * This file is in the Services layer. It imports from Repos, Types, Config.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SickEntry } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import type { CreateSickEntryInput, UpdateSickEntryInput } from "@/types/sick";
import {
  AU_ALLOWED_TYPES,
  AU_MAX_SIZE_BYTES,
  ENTGELTFORTZAHLUNG_DAYS,
} from "@/types/sick";
import {
  createSickEntry,
  getSickEntryById,
  getSickEntriesByEmployee,
  getSickEntriesByTenant,
  updateSickEntry,
  updateAuCertificate,
  getActiveSickForTenant,
} from "@/repos/sickEntryRepo";
import { sendNotification } from "@/services/notificationService";
import { calculateWorkDaysCount, getEmployeeBundesland, formatDate } from "@/services/leaveHelpers";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/** Create a sick entry. If employee_id is not provided, uses creator's own ID. */
export async function createSickEntryRecord(
  supabase: SupabaseClient,
  tenantId: string,
  createdByEmployeeId: string,
  data: CreateSickEntryInput,
  nowIso: string,
): Promise<ApiResponse<SickEntry>> {
  const employeeId = data.employee_id ?? createdByEmployeeId;
  const bundesland = await getEmployeeBundesland(supabase, tenantId, employeeId);

  let workDaysCount: number | null = null;
  if (data.end_date && bundesland) {
    workDaysCount = await calculateWorkDaysCount(supabase, bundesland, data.start_date, data.end_date);
  }

  const entry = await createSickEntry(supabase, {
    tenant_id: tenantId,
    employee_id: employeeId,
    start_date: data.start_date,
    end_date: data.end_date ?? null,
    work_days_count: workDaysCount,
    notes: data.notes ?? null,
    created_by: createdByEmployeeId,
  });

  if (!entry) return failure("Krankmeldung konnte nicht erstellt werden");

  // If manager created it for employee, notify the employee
  if (employeeId !== createdByEmployeeId) {
    try {
      const { createAdminClient } = await import("@/config/supabase/server");
      const admin = createAdminClient();
      await sendNotification(
        supabase, tenantId, employeeId,
        "sick_entry_created", "Krankmeldung erfasst",
        `Krankmeldung erfasst: ${formatDate(data.start_date)}${data.end_date ? ` – ${formatDate(data.end_date)}` : " (fortlaufend)"}`,
        nowIso, admin,
      );
    } catch { /* Notification failures must not break main flow */ }
  }

  return success(entry);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/** Update a sick entry. If end_date is provided, recalculates work_days_count. */
export async function updateSickEntryRecord(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  role: string,
  sickEntryId: string,
  data: UpdateSickEntryInput,
): Promise<ApiResponse<SickEntry>> {
  const entry = await getSickEntryById(supabase, tenantId, sickEntryId);
  if (!entry) return failure("Krankmeldung nicht gefunden");
  if (role === "employee" && entry.employee_id !== employeeId) {
    return failure("Du kannst nur eigene Krankmeldungen bearbeiten");
  }

  const updates: Record<string, unknown> = {};

  if (data.end_date !== undefined) {
    updates.end_date = data.end_date;
    const bundesland = await getEmployeeBundesland(supabase, tenantId, entry.employee_id);
    if (bundesland) {
      updates.work_days_count = await calculateWorkDaysCount(supabase, bundesland, entry.start_date, data.end_date);
    }
  }

  if (data.notes !== undefined) updates.notes = data.notes;

  const updated = await updateSickEntry(supabase, tenantId, sickEntryId, updates as { end_date?: string; work_days_count?: number; notes?: string });
  if (!updated) return failure("Krankmeldung konnte nicht aktualisiert werden");
  return success(updated);
}

// ---------------------------------------------------------------------------
// AU Upload
// ---------------------------------------------------------------------------

export interface AuUploadResult { sickEntry: SickEntry }

/** Upload an AU certificate for a sick entry. */
export async function uploadAuCertificate(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  role: string,
  sickEntryId: string,
  file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  nowIso: string,
): Promise<ApiResponse<AuUploadResult>> {
  const entry = await getSickEntryById(supabase, tenantId, sickEntryId);
  if (!entry) return failure("Krankmeldung nicht gefunden");
  if (role === "employee" && entry.employee_id !== employeeId) return failure("Nicht berechtigt");

  if (!AU_ALLOWED_TYPES.includes(file.type as typeof AU_ALLOWED_TYPES[number])) {
    return failure("Ungültiges Format. Nur PDF, JPG, PNG erlaubt.");
  }
  if (file.size > AU_MAX_SIZE_BYTES) return failure("Datei zu groß. Maximal 10 MB erlaubt.");

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `tenants/${tenantId}/au/${sickEntryId}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("au-certificates")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("AU upload failed:", uploadError);
    return failure("Datei konnte nicht hochgeladen werden");
  }

  const updated = await updateAuCertificate(supabase, tenantId, sickEntryId, path, nowIso);
  if (!updated) return failure("Krankmeldung konnte nicht aktualisiert werden");
  return success({ sickEntry: updated });
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/** List sick entries, filtered by role. */
export async function listSickEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  role: string,
  options?: { year?: number },
): Promise<ApiResponse<SickEntry[]>> {
  if (role === "admin" || role === "manager") {
    return success(await getSickEntriesByTenant(supabase, tenantId, options));
  }
  return success(await getSickEntriesByEmployee(supabase, tenantId, employeeId, options));
}

// ---------------------------------------------------------------------------
// Entgeltfortzahlung
// ---------------------------------------------------------------------------

export interface EntgeltfortzahlungEntry {
  sickEntry: SickEntry;
  calendarDays: number;
  exceeded: boolean;
}

/** Check Entgeltfortzahlung status for ongoing sick entries. */
export async function checkEntgeltfortzahlung(
  supabase: SupabaseClient,
  tenantId: string,
  nowIso: string,
): Promise<EntgeltfortzahlungEntry[]> {
  const today = nowIso.split("T")[0];
  const ongoing = await getActiveSickForTenant(supabase, tenantId, "2000-01-01", today);
  const nowMs = Date.parse(nowIso);
  const results: EntgeltfortzahlungEntry[] = [];

  for (const entry of ongoing) {
    if (entry.end_date) continue;
    const startMs = Date.parse(entry.start_date + "T12:00:00Z");
    const calendarDays = Math.floor((nowMs - startMs) / 86_400_000);
    if (calendarDays >= 35) {
      results.push({ sickEntry: entry, calendarDays, exceeded: calendarDays >= ENTGELTFORTZAHLUNG_DAYS });
    }
  }

  return results;
}
