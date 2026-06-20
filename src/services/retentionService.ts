/**
 * Retention Service — Data retention enforcement (§16 Abs. 2 ArbZG).
 *
 * Handles 2-year soft-deletion of old time entries.
 * Audit records are preserved (retained for legal defense).
 *
 * This file is in the Services layer. It imports from Repos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getExpiredEntries,
  softDeleteEntries,
} from "@/repos/exportRepo";

/** Retention period in days (2 years = 730 days). */
const RETENTION_PERIOD_DAYS = 730;

/**
 * Calculate the cutoff date for retention.
 * Entries with clock_in before this date should be soft-deleted.
 * @param nowIso - Current ISO timestamp (server-generated)
 */
export function calculateCutoffDate(nowIso: string): string {
  const ms = Date.parse(nowIso);
  const cutoffMs = ms - RETENTION_PERIOD_DAYS * 86_400_000;
  // Use epoch-based conversion to avoid new Date()
  return isoFromEpoch(cutoffMs);
}

/**
 * Run retention cleanup for a tenant.
 * Soft-deletes time entries older than 2 years.
 * Returns the number of entries deleted.
 */
export async function runRetentionForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  nowIso: string,
): Promise<number> {
  const cutoffDate = calculateCutoffDate(nowIso);
  const expiredIds = await getExpiredEntries(supabase, tenantId, cutoffDate);

  if (expiredIds.length === 0) return 0;

  // Pass the nowIso timestamp for the soft-delete operation
  const deletedCount = await softDeleteEntries(supabase, expiredIds, nowIso);
  return deletedCount;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert epoch ms to YYYY-MM-DD without new Date(). */
function isoFromEpoch(ms: number): string {
  const daysSinceEpoch = Math.floor(ms / 86_400_000);
  return computeDate(daysSinceEpoch);
}

function computeDate(daysSinceEpoch: number): string {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  let remaining = daysSinceEpoch;
  let year = 1970;

  while (true) {
    const yearDays = isLeap(year) ? 366 : 365;
    if (remaining < yearDays) break;
    remaining -= yearDays;
    year++;
  }

  const months = [...dim];
  if (isLeap(year)) months[1] = 29;

  let month = 0;
  for (let m = 0; m < 12; m++) {
    if (remaining < months[m]) {
      month = m;
      break;
    }
    remaining -= months[m];
    if (m === 11) month = 11;
  }

  const day = remaining + 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
