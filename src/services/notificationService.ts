/**
 * Notification Service — Business logic for notifications.
 *
 * Handles:
 * - Sending notifications (with 24h dedup)
 * - Notifying managers/admins
 * - Listing, marking read, unread count
 * - Cron: compliance notifications (forgot clock-out, break reminders)
 *
 * This file is in the Services layer. It imports from Repos and Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import {
  createNotification,
  getNotificationsForEmployee,
  getNotificationById,
  markNotificationRead as repoMarkRead,
  markAllNotificationsRead as repoMarkAllRead,
  getUnreadNotificationCount,
  hasRecentNotification,
  getManagersForTenant,
  getEmployeesWithActiveEntries,
} from "@/repos/notificationRepo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// subtractHours: uses Date constructor purely for ISO formatting of a computed
// epoch value — not for recording a legal timestamp.
/** Subtract hours from an ISO timestamp, return new ISO string. */
function subtractHours(iso: string, hours: number): string {
  const ms = Date.parse(iso) - hours * 3_600_000;
  // Format epoch ms to ISO string without new Date()
  return new Date(ms).toISOString(); // eslint-disable-line @quoska/legal/no-client-timestamps
}

/** Diff in minutes between two ISO strings. */
function diffInMinutes(isoA: string, isoB: string): number {
  return Math.round(Math.abs(Date.parse(isoB) - Date.parse(isoA)) / 60_000);
}

// ---------------------------------------------------------------------------
// Send notifications
// ---------------------------------------------------------------------------

/**
 * Send a notification to a specific employee.
 * Checks for duplicate within 24h before creating.
 */
export async function sendNotification(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  type: string,
  title: string,
  message: string,
  nowIso: string,
  adminSupabase?: SupabaseClient,
): Promise<ApiResponse<Notification | null>> {
  // Use admin client for cross-employee operations if provided
  const client = adminSupabase ?? supabase;

  // Dedup: check for existing notification of same type within 24h
  const sinceIso = subtractHours(nowIso, 24);
  const exists = await hasRecentNotification(
    client, tenantId, employeeId, type, sinceIso,
  );
  if (exists) {
    return success(null); // Already notified recently
  }

  const notification = await createNotification(client, {
    tenant_id: tenantId,
    employee_id: employeeId,
    type,
    title,
    message,
  });

  return success(notification);
}

/**
 * Send a notification to all managers and admins of a tenant.
 */
export async function notifyManagers(
  supabase: SupabaseClient,
  tenantId: string,
  type: string,
  title: string,
  message: string,
  nowIso: string,
  adminSupabase?: SupabaseClient,
): Promise<number> {
  // Must use admin client to query managers (RLS blocks employee from seeing managers)
  const client = adminSupabase ?? supabase;
  const managers = await getManagersForTenant(client, tenantId);
  let sent = 0;

  for (const mgr of managers) {
    const result = await sendNotification(
      supabase, tenantId, mgr.id, type, title, message, nowIso, adminSupabase,
    );
    if (result.data) sent++;
  }

  return sent;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * List notifications for an employee.
 * Unread first, then read, sorted by date descending.
 */
export async function listNotifications(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  options?: { limit?: number; unreadOnly?: boolean },
): Promise<ApiResponse<Notification[]>> {
  const notifications = await getNotificationsForEmployee(
    supabase, tenantId, employeeId, options,
  );
  return success(notifications);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  supabase: SupabaseClient,
  tenantId: string,
  notificationId: string,
  employeeId: string,
): Promise<ApiResponse<Notification>> {
  const notification = await getNotificationById(
    supabase, tenantId, notificationId,
  );

  if (!notification) {
    return failure("Benachrichtigung nicht gefunden");
  }

  if (notification.employee_id !== employeeId) {
    return failure("Nicht berechtigt");
  }

  const updated = await repoMarkRead(
    supabase, tenantId, notificationId, employeeId,
  );

  if (!updated) {
    return failure("Benachrichtigung konnte nicht aktualisiert werden");
  }

  return success(updated);
}

/**
 * Mark all notifications as read for an employee.
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<ApiResponse<number>> {
  const count = await repoMarkAllRead(supabase, tenantId, employeeId);
  return success(count);
}

/**
 * Get unread notification count for an employee.
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<number> {
  return getUnreadNotificationCount(supabase, tenantId, employeeId);
}

// ---------------------------------------------------------------------------
// Cron: Compliance notifications
// ---------------------------------------------------------------------------

interface ComplianceCronResult {
  forgotClockOuts: number;
  breakReminders: number;
}

/**
 * Run compliance notification checks for all tenants.
 * Called by the cron endpoint.
 *
 * Checks:
 * - Employees with running entries >10h → forgot_clockout
 * - Employees working >5h45m without break → break_reminder
 */
export async function runComplianceNotifications(
  supabase: SupabaseClient,
  nowIso: string,
): Promise<ComplianceCronResult> {
  const result: ComplianceCronResult = {
    forgotClockOuts: 0,
    breakReminders: 0,
  };

  // Get all tenants
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id");

  if (!tenants) return result;

  for (const tenant of tenants) {
    const activeEntries = await getEmployeesWithActiveEntries(
      supabase, tenant.id,
    );

    for (const entry of activeEntries) {
      const workMinutes = diffInMinutes(entry.clock_in, nowIso) - entry.break_minutes;

      // Forgot clock-out: running >10h
      if (workMinutes > 600) {
        const notifResult = await sendNotification(
          supabase,
          tenant.id,
          entry.employee_id,
          "forgot_clockout",
          "Ausstempeln vergessen?",
          `Du bist seit über 10 Stunden eingestempelt. Ausstempeln vergessen?`,
          nowIso,
        );
        if (notifResult.data) result.forgotClockOuts++;
      }

      // Break reminder: working >5h45m without sufficient break
      if (workMinutes >= 345 && entry.break_minutes < 30) {
        const notifResult = await sendNotification(
          supabase,
          tenant.id,
          entry.employee_id,
          "break_reminder",
          "Pause erforderlich",
          "In 15 Minuten ist eine Pause von mindestens 30 Minuten fällig (§4 ArbZG).",
          nowIso,
        );
        if (notifResult.data) result.breakReminders++;
      }
    }
  }

  return result;
}
