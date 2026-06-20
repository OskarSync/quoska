/**
 * Sick Entry Repo — Database queries for sick_entries table.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SickEntry } from "@/types/database";

/** Create a sick entry. Returns the inserted row or null on error. */
export async function createSickEntry(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    employee_id: string;
    start_date: string;
    end_date?: string | null;
    work_days_count?: number | null;
    notes?: string | null;
    created_by: string;
  },
): Promise<SickEntry | null> {
  const { data: inserted, error } = await supabase
    .from("sick_entries")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create sick entry:", error);
    return null;
  }

  return inserted;
}

/** Get a sick entry by ID, scoped to tenant. */
export async function getSickEntryById(
  supabase: SupabaseClient,
  tenantId: string,
  sickEntryId: string,
): Promise<SickEntry | null> {
  const { data } = await supabase
    .from("sick_entries")
    .select("*")
    .eq("id", sickEntryId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/** Get sick entries for a specific employee. */
export async function getSickEntriesByEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  options?: { year?: number },
): Promise<SickEntry[]> {
  let query = supabase
    .from("sick_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  if (options?.year) {
    query = query.gte("start_date", `${options.year}-01-01`);
  }

  const { data } = await query.order("start_date", { ascending: false });
  return data ?? [];
}

/** Get sick entries for a tenant (all employees). */
export async function getSickEntriesByTenant(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { year?: number },
): Promise<SickEntry[]> {
  let query = supabase
    .from("sick_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (options?.year) {
    query = query.gte("start_date", `${options.year}-01-01`);
  }

  const { data } = await query.order("start_date", { ascending: false });
  return data ?? [];
}

/** Update a sick entry. */
export async function updateSickEntry(
  supabase: SupabaseClient,
  tenantId: string,
  sickEntryId: string,
  updates: {
    end_date?: string | null;
    work_days_count?: number | null;
    notes?: string | null;
  },
): Promise<SickEntry | null> {
  const { data, error } = await supabase
    .from("sick_entries")
    .update(updates)
    .eq("id", sickEntryId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update sick entry:", error);
    return null;
  }

  return data;
}

/** Update AU certificate URL and upload timestamp. */
export async function updateAuCertificate(
  supabase: SupabaseClient,
  tenantId: string,
  sickEntryId: string,
  url: string,
  uploadedAt: string,
): Promise<SickEntry | null> {
  const { data, error } = await supabase
    .from("sick_entries")
    .update({
      au_certificate_url: url,
      au_uploaded_at: uploadedAt,
    })
    .eq("id", sickEntryId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update AU certificate:", error);
    return null;
  }

  return data;
}

/** Get ongoing sick entries (end_date is null) for a tenant. */
export async function getOngoingSickEntries(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SickEntry[]> {
  const { data } = await supabase
    .from("sick_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("end_date", null)
    .is("deleted_at", null);

  return data ?? [];
}

/** Check if an employee has a sick entry covering a specific date. */
export async function getActiveSickForDate(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  date: string,
): Promise<SickEntry | null> {
  const { data } = await supabase
    .from("sick_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .lte("start_date", date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .maybeSingle();

  return data;
}

/** Get sick entries for a tenant in a date range (calendar). */
export async function getActiveSickForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<SickEntry[]> {
  const { data } = await supabase
    .from("sick_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .lte("start_date", endDate)
    .or(`end_date.is.null,end_date.gte.${startDate}`);

  return data ?? [];
}
