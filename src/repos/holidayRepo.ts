/**
 * Holiday Repo — Database queries for public_holidays table.
 *
 * All functions accept a Supabase client so callers can choose
 * between RLS-enforced or admin client.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicHoliday } from "@/types/database";

/**
 * Check if a date is a public holiday for a given Bundesland.
 * Checks both nationwide ('all') and state-specific holidays.
 */
export async function isPublicHoliday(
  supabase: SupabaseClient,
  date: string,
  bundesland: string,
): Promise<PublicHoliday | null> {
  const { data } = await supabase
    .from("public_holidays")
    .select("*")
    .eq("date", date)
    .or(`bundesland.eq.all,bundesland.eq.${bundesland}`)
    .maybeSingle();

  return data;
}

/**
 * Get all public holidays for a specific Bundesland in a date range.
 * Includes nationwide holidays (bundesland='all').
 */
export async function getHolidaysInRange(
  supabase: SupabaseClient,
  bundesland: string,
  startDate: string,
  endDate: string,
): Promise<PublicHoliday[]> {
  const { data } = await supabase
    .from("public_holidays")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .or(`bundesland.eq.all,bundesland.eq.${bundesland}`)
    .order("date", { ascending: true });

  return data ?? [];
}

/**
 * Get all holidays for a specific date (all Bundesländer).
 * Used for admin views showing all holidays.
 */
export async function getHolidaysForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<PublicHoliday[]> {
  const { data } = await supabase
    .from("public_holidays")
    .select("*")
    .eq("date", date)
    .order("bundesland", { ascending: true });

  return data ?? [];
}

/**
 * Check multiple dates for holidays in a single query.
 * Returns a map of date → holiday name for the given Bundesland.
 */
export async function getHolidayDatesInRange(
  supabase: SupabaseClient,
  bundesland: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, string>> {
  const holidays = await getHolidaysInRange(
    supabase,
    bundesland,
    startDate,
    endDate,
  );

  const map = new Map<string, string>();
  for (const h of holidays) {
    // If multiple holidays on same date, keep the first (nationwide)
    if (!map.has(h.date)) {
      map.set(h.date, h.name);
    }
  }
  return map;
}
