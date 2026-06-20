/**
 * Unit tests for overtimeService — net work minutes, overtime calculation,
 * formatting.
 */

import { describe, test, expect } from "vitest";
import {
  netMinutesForEntry,
  netMinutesForRunningEntry,
  totalNetMinutes,
  calculateOvertime,
  formatOvertime,
  formatDuration,
} from "@/services/overtimeService";
import type { TimeEntry } from "@/types/database";

/** Create a mock time entry. */
function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: "entry-1",
    tenant_id: "t-1",
    employee_id: "emp-1",
    date: "2026-06-01",
    clock_in: "2026-06-01T08:00:00.000Z",
    clock_out: "2026-06-01T16:30:00.000Z",
    break_minutes: 30,
    status: "completed",
    notes: null,
    created_at: "2026-06-01T08:00:00.000Z",
    updated_at: "2026-06-01T16:30:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// netMinutesForEntry
// ---------------------------------------------------------------------------

describe("netMinutesForEntry", () => {
  test("calculates net minutes for completed entry", () => {
    // 08:00 to 16:30 = 510 min gross, -30 break = 480 min net
    const entry = makeEntry();
    expect(netMinutesForEntry(entry)).toBe(480);
  });

  test("returns 0 for entry without clock_out", () => {
    const entry = makeEntry({ clock_out: null, status: "running" });
    expect(netMinutesForEntry(entry)).toBe(0);
  });

  test("calculates correctly with long break", () => {
    // 08:00 to 18:00 = 600 min gross, -60 break = 540 min net
    const entry = makeEntry({
      clock_out: "2026-06-01T18:00:00.000Z",
      break_minutes: 60,
    });
    expect(netMinutesForEntry(entry)).toBe(540);
  });

  test("calculates midnight crossover correctly", () => {
    // 22:00 to 06:00 next day = 480 min gross, -30 break = 450 net
    const entry = makeEntry({
      clock_in: "2026-06-01T22:00:00.000Z",
      clock_out: "2026-06-02T06:00:00.000Z",
    });
    expect(netMinutesForEntry(entry)).toBe(450);
  });
});

// ---------------------------------------------------------------------------
// netMinutesForRunningEntry
// ---------------------------------------------------------------------------

describe("netMinutesForRunningEntry", () => {
  test("calculates net minutes using nowIso", () => {
    const entry = makeEntry({
      clock_out: null,
      status: "running",
      clock_in: "2026-06-01T08:00:00.000Z",
    });
    // nowIso = 12:00 → 240 min gross, -30 break = 210 net
    const result = netMinutesForRunningEntry(entry, "2026-06-01T12:00:00.000Z");
    expect(result).toBe(210);
  });
});

// ---------------------------------------------------------------------------
// totalNetMinutes
// ---------------------------------------------------------------------------

describe("totalNetMinutes", () => {
  test("sums net minutes for multiple entries", () => {
    const entries = [
      makeEntry({ id: "1", break_minutes: 30 }),
      makeEntry({
        id: "2",
        date: "2026-06-02",
        clock_in: "2026-06-02T09:00:00.000Z",
        clock_out: "2026-06-02T17:00:00.000Z",
        break_minutes: 0,
      }),
    ];
    // Entry 1: 08:00-16:30 = 480 net, Entry 2: 09:00-17:00 = 480 net
    expect(totalNetMinutes(entries)).toBe(960);
  });

  test("returns 0 for empty array", () => {
    expect(totalNetMinutes([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateOvertime
// ---------------------------------------------------------------------------

describe("calculateOvertime", () => {
  test("positive overtime", () => {
    const result = calculateOvertime(2520, 2400); // 42h worked, 40h target
    expect(result.overtimeMinutes).toBe(120);
    expect(result.overtimeDisplay).toBe("+2h 00m");
  });

  test("negative overtime", () => {
    const result = calculateOvertime(2280, 2400); // 38h worked, 40h target
    expect(result.overtimeMinutes).toBe(-120);
    expect(result.overtimeDisplay).toBe("-2h 00m");
  });

  test("exact target", () => {
    const result = calculateOvertime(2400, 2400);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimeDisplay).toBe("+0 Min");
  });

  test("small overtime with minutes", () => {
    const result = calculateOvertime(2430, 2400); // +30 min
    expect(result.overtimeMinutes).toBe(30);
    expect(result.overtimeDisplay).toBe("+30 Min");
  });
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

describe("formatOvertime", () => {
  test("positive minutes with hours", () => {
    expect(formatOvertime(150)).toBe("+2h 30m");
  });

  test("negative minutes with hours", () => {
    expect(formatOvertime(-90)).toBe("-1h 30m");
  });

  test("zero", () => {
    expect(formatOvertime(0)).toBe("+0 Min");
  });

  test("small positive", () => {
    expect(formatOvertime(15)).toBe("+15 Min");
  });

  test("small negative", () => {
    expect(formatOvertime(-15)).toBe("-15 Min");
  });
});

describe("formatDuration", () => {
  test("full hours", () => {
    expect(formatDuration(480)).toBe("8 Std 0 Min");
  });

  test("hours and minutes", () => {
    expect(formatDuration(510)).toBe("8 Std 30 Min");
  });

  test("only minutes", () => {
    expect(formatDuration(30)).toBe("30 Min");
  });
});
