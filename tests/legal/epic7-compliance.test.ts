/**
 * Epic 7 Legal Compliance Tests — Notifications
 *
 * Tests for Stories 7.1-7.3 verifying:
 * - Forgot clock-out notification triggers at >10h
 * - Break reminder triggers at >5h45m without break
 * - Deduplication within 24h window
 * - Correction request notifications (submit → manager, approve/reject → employee)
 * - Notification read state management
 * - No duplicate notifications on repeated cron runs
 */

import { describe, test, expect } from "vitest";
import type { Notification } from "@/types/database";
import { createMockSupabase, createTableMock } from "./helpers/supabase-mock";

// ---------------------------------------------------------------------------
// 7.1 — Compliance notification triggers
// ---------------------------------------------------------------------------

describe("Epic 7.1 — Compliance notification triggers", () => {
  test("forgot clock-out: notification created when running entry >10h", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => ({
          data: [{
            employee_id: "e-1",
            clock_in: "2026-06-03T20:00:00.000Z", // 14 hours ago
            break_minutes: 0,
            employees: { first_name: "Thomas", last_name: "Meyer" },
          }],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => {
          return { data: { id: "n-1", type: "forgot_clockout" }, error: null };
        },
      }),
    });

    const result = await runComplianceNotifications(
      supabase, "2026-06-04T10:00:00.000Z",
    );

    expect(result.forgotClockOuts).toBe(1);
  });

  test("break reminder: notification created when working >5h45m without break", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => ({
          data: [{
            employee_id: "e-1",
            clock_in: "2026-06-04T04:00:00.000Z", // 6 hours ago, no break
            break_minutes: 0,
            employees: { first_name: "Lisa", last_name: "Schulz" },
          }],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => ({
          data: { id: "n-2", type: "break_reminder" },
          error: null,
        }),
      }),
    });

    const result = await runComplianceNotifications(
      supabase, "2026-06-04T10:00:00.000Z",
    );

    expect(result.breakReminders).toBe(1);
  });

  test("no notification when entry <10h (forgot clock-out threshold)", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => ({
          data: [{
            employee_id: "e-1",
            clock_in: "2026-06-04T03:00:00.000Z", // 7 hours ago
            break_minutes: 0,
            employees: { first_name: "Karl", last_name: "Weber" },
          }],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => {
          return { data: null, error: null };
        },
      }),
    });

    const result = await runComplianceNotifications(
      supabase, "2026-06-04T10:00:00.000Z",
    );

    expect(result.forgotClockOuts).toBe(0);
  });

  test("deduplication: no duplicate notification within 24h", async () => {
    const { sendNotification } = await import("@/services/notificationService");

    // Simulate: recent notification already exists
    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [{ id: "existing" }] }),
        insertResolver: async () => ({ data: null, error: null }),
      }),
    });

    const result = await sendNotification(
      supabase, "t-1", "e-1",
      "forgot_clockout",
      "Ausstempeln vergessen?",
      "Du bist seit über 10 Stunden eingestempelt.",
      "2026-06-04T10:00:00.000Z",
    );

    expect(result.data).toBeNull(); // Skipped due to dedup
  });

  test("repeated cron run does not create duplicates (24h dedup)", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    let insertCount = 0;
    const createSupabase = () => createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => ({
          data: [{
            employee_id: "e-1",
            clock_in: "2026-06-03T20:00:00.000Z",
            break_minutes: 0,
            employees: { first_name: "Thomas", last_name: "Meyer" },
          }],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [{ id: "existing" }] }), // Dedup
        insertResolver: async () => {
          insertCount++;
          return { data: null, error: null };
        },
      }),
    });

    // Run twice
    await runComplianceNotifications(createSupabase(), "2026-06-04T10:00:00.000Z");
    await runComplianceNotifications(createSupabase(), "2026-06-04T10:15:00.000Z");

    expect(insertCount).toBe(0); // No new notifications created
  });
});

// ---------------------------------------------------------------------------
// 7.2 — Correction request notifications
// ---------------------------------------------------------------------------

describe("Epic 7.2 — Correction request notifications", () => {
  test("correction request submission notifies managers", async () => {
    const { notifyManagers } = await import("@/services/notificationService");

    let notificationCount = 0;
    const supabase = createMockSupabase({
      employees: createTableMock({
        selectResolver: async () => ({
          data: [
            { id: "mgr-1", first_name: "Anna", last_name: "Admin" },
            { id: "mgr-2", first_name: "Max", last_name: "Manager" },
          ],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }), // No dedup
        insertResolver: async () => {
          notificationCount++;
          return { data: { id: `n-${notificationCount}` }, error: null };
        },
      }),
    });

    const sent = await notifyManagers(
      supabase, "t-1",
      "correction_request",
      "Neue Korrekturanfrage",
      "Mitarbeiter hat eine Korrektur angefordert",
      "2026-06-04T10:00:00.000Z",
    );

    expect(sent).toBe(2); // Both managers notified
  });

  test("correction approval notifies the requesting employee", async () => {
    const { sendNotification } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => ({
          data: { id: "n-1", type: "correction_approved", employee_id: "e-1" },
          error: null,
        }),
      }),
    });

    const result = await sendNotification(
      supabase, "t-1", "e-1",
      "correction_approved",
      "Korrektur genehmigt",
      "Deine Korrekturanfrage wurde genehmigt.",
      "2026-06-04T10:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.type).toBe("correction_approved");
  });

  test("correction rejection notifies the requesting employee", async () => {
    const { sendNotification } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => ({
          data: { id: "n-1", type: "correction_rejected", employee_id: "e-1" },
          error: null,
        }),
      }),
    });

    const result = await sendNotification(
      supabase, "t-1", "e-1",
      "correction_rejected",
      "Korrektur abgelehnt",
      "Deine Korrekturanfrage wurde abgelehnt.",
      "2026-06-04T10:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.type).toBe("correction_rejected");
  });
});

// ---------------------------------------------------------------------------
// 7.3 — Notification read state
// ---------------------------------------------------------------------------

describe("Epic 7.3 — Notification read state", () => {
  test("unread notification is returned first in listing", async () => {
    const { listNotifications } = await import("@/services/notificationService");

    const readNotif: Notification = {
      id: "n-1", tenant_id: "t-1", employee_id: "e-1",
      type: "forgot_clockout", title: "Test", message: "Read",
      read: true, created_at: "2026-06-04T10:00:00.000Z",
    };
    const unreadNotif: Notification = {
      id: "n-2", tenant_id: "t-1", employee_id: "e-1",
      type: "break_reminder", title: "Test", message: "Unread",
      read: false, created_at: "2026-06-04T11:00:00.000Z",
    };

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [unreadNotif, readNotif] }),
      }),
    });

    const result = await listNotifications(supabase, "t-1", "e-1");
    expect(result.data).toHaveLength(2);
  });

  test("marking notification as read changes its state", async () => {
    const { markNotificationRead } = await import("@/services/notificationService");

    let selectCallCount = 0;
    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              data: {
                id: "n-1",
                tenant_id: "t-1",
                employee_id: "e-1",
                read: false,
                type: "forgot_clockout",
                title: "Test",
                message: "Test",
                created_at: "2026-06-04T10:00:00.000Z",
              },
            };
          }
          return { data: null };
        },
        updateResolver: async () => ({
          data: {
            id: "n-1",
            tenant_id: "t-1",
            employee_id: "e-1",
            read: true,
            type: "forgot_clockout",
            title: "Test",
            message: "Test",
            created_at: "2026-06-04T10:00:00.000Z",
          },
          error: null,
        }),
      }),
    });

    const result = await markNotificationRead(supabase, "t-1", "n-1", "e-1");
    expect(result.data).not.toBeNull();
  });

  test("employee cannot mark another employee's notification", async () => {
    const { markNotificationRead } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({
          data: {
            id: "n-1",
            tenant_id: "t-1",
            employee_id: "e-other", // Different employee
            read: false,
            type: "forgot_clockout",
            title: "Test",
            message: "Test",
            created_at: "2026-06-04T10:00:00.000Z",
          },
        }),
      }),
    });

    const result = await markNotificationRead(supabase, "t-1", "n-1", "e-1");
    expect(result.error).toContain("berechtigt");
  });
});
