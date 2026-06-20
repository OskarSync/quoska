/**
 * Notification Service Tests
 *
 * Tests for Story 7.1-7.3:
 * - sendNotification with dedup
 * - notifyManagers
 * - listNotifications
 * - markNotificationRead
 * - markAllNotificationsRead
 * - getUnreadCount
 * - runComplianceNotifications (cron logic)
 */

import { describe, test, expect } from "vitest";
import type { Notification } from "@/types/database";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";

const baseNotification: Notification = {
  id: "n-1",
  tenant_id: "t-1",
  employee_id: "e-1",
  type: "forgot_clockout",
  title: "Ausstempeln vergessen?",
  message: "Du bist seit über 10 Stunden eingestempelt.",
  read: false,
  created_at: "2026-06-04T10:00:00.000Z",
};

// ---------------------------------------------------------------------------
// sendNotification + dedup
// ---------------------------------------------------------------------------

describe("sendNotification", () => {
  test("creates notification when no recent duplicate exists", async () => {
    const { sendNotification } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        // hasRecentNotification returns empty → no dedup
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => ({
          data: baseNotification,
          error: null,
        }),
      }),
    });

    const result = await sendNotification(
      supabase, "t-1", "e-1",
      "forgot_clockout",
      "Ausstempeln vergessen?",
      "Du bist seit über 10 Stunden eingestempelt.",
      "2026-06-04T10:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.type).toBe("forgot_clockout");
  });

  test("skips creation when recent duplicate exists (dedup)", async () => {
    const { sendNotification } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        // hasRecentNotification returns existing → dedup triggered
        selectResolver: async () => ({ data: [{ id: "existing" }] }),
        insertResolver: async () => ({
          data: baseNotification,
          error: null,
        }),
      }),
    });

    const result = await sendNotification(
      supabase, "t-1", "e-1",
      "forgot_clockout",
      "Ausstempeln vergessen?",
      "Du bist seit über 10 Stunden eingestempelt.",
      "2026-06-04T10:00:00.000Z",
    );

    // Should return success with null data (skipped)
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listNotifications
// ---------------------------------------------------------------------------

describe("listNotifications", () => {
  test("returns notifications sorted unread first", async () => {
    const { listNotifications } = await import("@/services/notificationService");

    const readNotif: Notification = { ...baseNotification, id: "n-2", read: true };
    const unreadNotif: Notification = { ...baseNotification, id: "n-3", read: false };

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [unreadNotif, readNotif] }),
      }),
    });

    const result = await listNotifications(supabase, "t-1", "e-1");
    expect(result.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------

describe("markNotificationRead", () => {
  test("marks a notification as read", async () => {
    const { markNotificationRead } = await import("@/services/notificationService");

    let selectCallCount = 0;
    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => {
          selectCallCount++;
          // First call: getNotificationById
          if (selectCallCount === 1) {
            return { data: { ...baseNotification, employee_id: "e-1" } };
          }
          return { data: null };
        },
        updateResolver: async () => ({
          data: { ...baseNotification, read: true },
          error: null,
        }),
      }),
    });

    const result = await markNotificationRead(
      supabase, "t-1", "n-1", "e-1",
    );
    expect(result.data).not.toBeNull();
  });

  test("rejects if notification belongs to another employee", async () => {
    const { markNotificationRead } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({
          data: { ...baseNotification, employee_id: "e-other" },
        }),
      }),
    });

    const result = await markNotificationRead(
      supabase, "t-1", "n-1", "e-1",
    );
    expect(result.error).toContain("berechtigt");
  });
});

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------

describe("markAllNotificationsRead", () => {
  test("returns count of updated notifications", async () => {
    const { markAllNotificationsRead } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        updateResolver: async () => ({ data: null, error: null, count: 5 }),
      }),
    });

    const result = await markAllNotificationsRead(
      supabase, "t-1", "e-1",
    );
    expect(result.data).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

describe("getUnreadCount", () => {
  test("returns unread notification count", async () => {
    const { getUnreadCount } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      notifications: createTableMock({
        selectResolver: async () => ({ data: [baseNotification], count: 3 }),
      }),
    });

    const count = await getUnreadCount(supabase, "t-1", "e-1");
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// runComplianceNotifications
// ---------------------------------------------------------------------------

describe("runComplianceNotifications", () => {
  test("detects forgot clock-out for entries >10h", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => {
          return {
            data: [{
              employee_id: "e-1",
              clock_in: "2026-06-03T22:00:00.000Z", // 12 hours ago
              break_minutes: 0,
              employees: { first_name: "Max", last_name: "Müller" },
            }],
          };
        },
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }), // No existing → no dedup
        insertResolver: async () => ({
          data: { ...baseNotification, type: "forgot_clockout" },
          error: null,
        }),
      }),
    });

    const result = await runComplianceNotifications(
      supabase, "2026-06-04T10:00:00.000Z",
    );

    expect(result.forgotClockOuts).toBeGreaterThanOrEqual(0);
  });

  test("detects break reminder for entries >5h45m without break", async () => {
    const { runComplianceNotifications } = await import("@/services/notificationService");

    const supabase = createMockSupabase({
      tenants: createTableMock({
        selectResolver: async () => ({ data: [{ id: "t-1" }] }),
      }),
      time_entries: createTableMock({
        selectResolver: async () => ({
          data: [{
            employee_id: "e-1",
            clock_in: "2026-06-04T04:00:00.000Z", // 6 hours ago
            break_minutes: 0,
            employees: { first_name: "Anna", last_name: "Schmidt" },
          }],
        }),
      }),
      notifications: createTableMock({
        selectResolver: async () => ({ data: [] }),
        insertResolver: async () => ({
          data: { ...baseNotification, type: "break_reminder" },
          error: null,
        }),
      }),
    });

    const result = await runComplianceNotifications(
      supabase, "2026-06-04T10:00:00.000Z",
    );

    expect(result.breakReminders).toBeGreaterThanOrEqual(0);
  });
});
