/**
 * Absence Service Tests (Epic 9+10 integration)
 *
 * Covers:
 * - isAbsentOnDate: vacation + sick detection
 * - calculateWorkDaysCountPure: weekends + holidays excluded
 * - calendarDaysBetween: calendar day calculation
 * - getAbsencesForPeriod: combined leave + sick entries
 */

import { describe, test, expect } from "vitest";
import type { LeaveRequest, SickEntry } from "@/types/database";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";
import {
  calculateWorkDaysCountPure,
  calendarDaysBetween,
} from "@/services/absenceService";

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

describe("calculateWorkDaysCountPure", () => {
  test("counts weekdays excluding weekends", () => {
    // Mon Jun 22 - Fri Jun 26, 2026 = 5 work days
    const result = calculateWorkDaysCountPure("2026-06-22", "2026-06-26", new Set());
    expect(result).toBe(5);
  });

  test("excludes weekends", () => {
    // Mon Jun 22 - Sun Jun 28, 2026 = 5 work days (Sat+Sun excluded)
    const result = calculateWorkDaysCountPure("2026-06-22", "2026-06-28", new Set());
    expect(result).toBe(5);
  });

  test("excludes holidays", () => {
    // Mon Jun 22 - Fri Jun 26, with Wed Jun 24 as holiday = 4 work days
    const holidays = new Set(["2026-06-24"]);
    const result = calculateWorkDaysCountPure("2026-06-22", "2026-06-26", holidays);
    expect(result).toBe(4);
  });

  test("excludes both weekends and holidays", () => {
    // Mon Jun 22 - Sun Jun 28, with Wed Jun 24 as holiday = 4 work days
    const holidays = new Set(["2026-06-24"]);
    const result = calculateWorkDaysCountPure("2026-06-22", "2026-06-28", holidays);
    expect(result).toBe(4);
  });

  test("returns 0 for weekend-only range", () => {
    // Sat Jun 27 - Sun Jun 28, 2026
    const result = calculateWorkDaysCountPure("2026-06-27", "2026-06-28", new Set());
    expect(result).toBe(0);
  });

  test("single workday returns 1", () => {
    const result = calculateWorkDaysCountPure("2026-06-22", "2026-06-22", new Set());
    expect(result).toBe(1);
  });

  test("single holiday returns 0", () => {
    const result = calculateWorkDaysCountPure("2026-06-24", "2026-06-24", new Set(["2026-06-24"]));
    expect(result).toBe(0);
  });
});

describe("calendarDaysBetween", () => {
  test("calculates calendar days between dates", () => {
    const result = calendarDaysBetween("2026-06-01", "2026-06-15");
    expect(result).toBe(14);
  });

  test("same day returns 0", () => {
    const result = calendarDaysBetween("2026-06-01", "2026-06-01");
    expect(result).toBe(0);
  });

  test("one day apart returns 1", () => {
    const result = calendarDaysBetween("2026-06-01", "2026-06-02");
    expect(result).toBe(1);
  });

  test("6 weeks (42 days) for Entgeltfortzahlung", () => {
    const result = calendarDaysBetween("2026-04-01", "2026-05-13");
    expect(result).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// DB-backed functions
// ---------------------------------------------------------------------------

describe("isAbsentOnDate", () => {
  test("returns vacation type when employee has approved leave", async () => {
    const { isAbsentOnDate } = await import("@/services/absenceService");
    const supabase = createMockSupabase({
      sick_entries: createTableMock({
        selectResolver: async () => ({ data: null }),
      }),
      leave_requests: createTableMock({
        selectResolver: async () => ({ data: { id: "lr-1" } }),
      }),
    });

    const result = await isAbsentOnDate(supabase, "t-1", "e-1", "2026-06-22");
    expect(result.isAbsent).toBe(true);
    expect(result.type).toBe("vacation");
  });

  test("returns sick type when employee has sick entry", async () => {
    const { isAbsentOnDate } = await import("@/services/absenceService");
    const supabase = createMockSupabase({
      sick_entries: createTableMock({
        selectResolver: async () => ({ data: { id: "se-1" } }),
      }),
      leave_requests: createTableMock({
        selectResolver: async () => ({ data: null }),
      }),
    });

    const result = await isAbsentOnDate(supabase, "t-1", "e-1", "2026-06-22");
    expect(result.isAbsent).toBe(true);
    expect(result.type).toBe("sick");
  });

  test("returns false when no absence", async () => {
    const { isAbsentOnDate } = await import("@/services/absenceService");
    const supabase = createMockSupabase({
      sick_entries: createTableMock({
        selectResolver: async () => ({ data: null }),
      }),
      leave_requests: createTableMock({
        selectResolver: async () => ({ data: null }),
      }),
    });

    const result = await isAbsentOnDate(supabase, "t-1", "e-1", "2026-06-22");
    expect(result.isAbsent).toBe(false);
    expect(result.type).toBeNull();
  });

  test("sick takes priority over vacation", async () => {
    const { isAbsentOnDate } = await import("@/services/absenceService");
    // Both sick and leave present — sick should be returned first
    const supabase = createMockSupabase({
      sick_entries: createTableMock({
        selectResolver: async () => ({ data: { id: "se-1" } }),
      }),
      leave_requests: createTableMock({
        selectResolver: async () => ({ data: { id: "lr-1" } }),
      }),
    });

    const result = await isAbsentOnDate(supabase, "t-1", "e-1", "2026-06-22");
    expect(result.isAbsent).toBe(true);
    expect(result.type).toBe("sick"); // Sick checked first
  });
});

describe("getAbsencesForPeriod", () => {
  test("combines approved leaves and sick entries", async () => {
    const { getAbsencesForPeriod } = await import("@/services/absenceService");

    const approvedLeave: LeaveRequest = {
      id: "lr-1", tenant_id: "t-1", employee_id: "e-1",
      type: "urlaub", start_date: "2026-06-22", end_date: "2026-06-22",
      work_days_count: 1, reason: null, status: "approved",
      reviewed_by: null, reviewed_at: null, review_note: null,
      created_at: "", updated_at: "", deleted_at: null,
    };

    const sickEntry: SickEntry = {
      id: "se-1", tenant_id: "t-1", employee_id: "e-2",
      start_date: "2026-06-23", end_date: "2026-06-23",
      work_days_count: 1, au_certificate_url: null, au_uploaded_at: null,
      notes: null, created_by: "mgr-1",
      created_at: "", updated_at: "", deleted_at: null,
    };

    const supabase = createMockSupabase({
      leave_requests: createTableMock({
        selectResolver: async () => ({ data: [approvedLeave] }),
      }),
      sick_entries: createTableMock({
        selectResolver: async () => ({ data: [sickEntry] }),
      }),
      public_holidays: createTableMock({
        selectResolver: async () => ({ data: [] }),
      }),
    });

    const result = await getAbsencesForPeriod(supabase, "t-1", "2026-06-22", "2026-06-23");
    expect(result.length).toBeGreaterThanOrEqual(2);

    const vacationEntry = result.find((a) => a.type === "vacation");
    const sickEntryResult = result.find((a) => a.type === "sick");
    expect(vacationEntry).toBeDefined();
    expect(sickEntryResult).toBeDefined();
  });
});
