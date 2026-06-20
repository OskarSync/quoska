/**
 * Notification Repo — Database queries for the notifications table.
 *
 * CRUD operations, deduplication check, and manager lookups.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification, Employee } from "@/types/database";

/**
 * Create a notification record.
 * Returns the inserted row or null on error.
 */
export async function createNotification(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    employee_id: string;
    type: string;
    title: string;
    message: string;
  },
): Promise<Notification | null> {
  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return inserted;
}

/**
 * Get notifications for an employee, scoped to tenant.
 * Results ordered: unread first (read=false), then by created_at desc.
 */
export async function getNotificationsForEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  options?: { limit?: number; unreadOnly?: boolean },
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId);

  if (options?.unreadOnly) {
    query = query.eq("read", false);
  }

  const { data } = await query
    .order("read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  return data ?? [];
}

/**
 * Get a single notification by ID, scoped to tenant.
 */
export async function getNotificationById(
  supabase: SupabaseClient,
  tenantId: string,
  notificationId: string,
): Promise<Notification | null> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

/**
 * Mark a single notification as read. Returns updated row.
 */
export async function markNotificationRead(
  supabase: SupabaseClient,
  tenantId: string,
  notificationId: string,
  employeeId: string,
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("read", false)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to mark notification read:", error);
    return null;
  }

  return data;
}

/**
 * Mark all notifications as read for an employee.
 * Returns the count of updated rows.
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("read", false);
  return count ?? 0;
}

/**
 * Get the count of unread notifications for an employee.
 */
export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("read", false);

  return count ?? 0;
}

/**
 * Check if a notification of the given type already exists for the employee
 * within the last `sinceIso` timeframe. Used for deduplication.
 */
export async function hasRecentNotification(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  type: string,
  sinceIso: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("type", type)
    .gte("created_at", sinceIso)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Get all managers and admins for a tenant.
 * Used to send correction request notifications.
 */
export async function getManagersForTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Pick<Employee, "id" | "first_name" | "last_name">[]> {
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "manager"])
    .is("deleted_at", null);

  return data ?? [];
}

/**
 * Get all active employees with a running or paused time entry.
 * Used by the compliance notification cron.
 */
export async function getEmployeesWithActiveEntries(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<(Notification & { clock_in: string; break_minutes: number; first_name: string; last_name: string })[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("employee_id, clock_in, break_minutes, employees!inner(first_name, last_name)")
    .eq("tenant_id", tenantId)
    .in("status", ["running", "paused"])
    .is("deleted_at", null);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    employee_id: row.employee_id as string,
    clock_in: row.clock_in as string,
    break_minutes: row.break_minutes as number,
    first_name: (row.employees as Record<string, unknown>)?.first_name as string,
    last_name: (row.employees as Record<string, unknown>)?.last_name as string,
  })) as (Notification & { clock_in: string; break_minutes: number; first_name: string; last_name: string })[];
}
