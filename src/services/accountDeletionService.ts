/**
 * Account Deletion Service — DSGVO-compliant account deletion.
 *
 * Implements a 14-day waiting period before hard deletion.
 * Logs deletion requests and handles scheduled cleanup.
 *
 * This file is in the Services layer. It imports from Repos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { hardDeleteTenantData } from "@/repos/exportRepo";

/** Deletion waiting period. */
const DELETION_WAITING_PERIOD = 14;

/**
 * Calculate the scheduled deletion date from the request date.
 * @param nowIso - Current ISO timestamp (server-generated)
 */
export function calculateDeletionDate(nowIso: string): string {
  const ms = Date.parse(nowIso);
  const deletionMs = ms + DELETION_WAITING_PERIOD * 86_400_000;
  return isoFromEpoch(deletionMs);
}

/**
 * Check if a date is 7 days before the scheduled deletion.
 * Used to send the final warning email.
 */
export function isFinalWarningDate(
  scheduledDeletionDate: string,
  nowIso: string,
): boolean {
  const nowDate = nowIso.slice(0, 10);
  const warnDate = addDaysToDateString(scheduledDeletionDate, -7);
  return nowDate === warnDate;
}

/**
 * Check if the deletion is due (scheduled date has passed).
 */
export function isDeletionDue(
  scheduledDeletionDate: string,
  nowIso: string,
): boolean {
  const nowDate = nowIso.slice(0, 10);
  return nowDate >= scheduledDeletionDate;
}

/**
 * Execute the full account deletion.
 * Hard-deletes all tenant data after the waiting period.
 * Returns true if deletion was successful.
 */
export async function executeAccountDeletion(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  try {
    await hardDeleteTenantData(supabase, tenantId);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Add N days to a YYYY-MM-DD string, returns YYYY-MM-DD. */
function addDaysToDateString(dateStr: string, days: number): string {
  const ms = Date.parse(dateStr + "T12:00:00Z");
  const resultMs = ms + days * 86_400_000;
  return isoFromEpoch(resultMs);
}

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
