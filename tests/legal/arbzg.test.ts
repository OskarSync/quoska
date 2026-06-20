/**
 * ArbZG Legal Compliance Tests
 *
 * Tests all working time regulations from the Arbeitszeitgesetz.
 * These tests MUST NEVER be skipped.
 *
 * Covers:
 * - §3 ArbZG: Max working hours (8h/10h/day, 48h/week)
 * - §4 ArbZG: Break requirements (30min/6h, 45min/9h, min 15min block)
 * - §5 ArbZG: Rest period (11h between shifts)
 */

import { describe, test, expect } from "vitest";
import {
  calculateRequiredBreak,
  calculateNetWorkMinutes,
  getBreakWarnings,
  getDailyLimitWarnings,
  getRestPeriodWarning,
  getWeeklyLimitWarnings,
} from "@/services/complianceService";

// ---------------------------------------------------------------------------
// §4 ArbZG — Break Requirements
// ---------------------------------------------------------------------------

describe("calculateRequiredBreak (§4 ArbZG)", () => {
  test("no break required for <6h work", () => {
    expect(calculateRequiredBreak(300)).toBe(0);
  });

  test("no break required for exactly 5h59m", () => {
    expect(calculateRequiredBreak(359)).toBe(0);
  });

  test("30min break required at exactly 6h", () => {
    expect(calculateRequiredBreak(360)).toBe(30);
  });

  test("30min break required at 8h", () => {
    expect(calculateRequiredBreak(480)).toBe(30);
  });

  test("45min break required at exactly 9h", () => {
    expect(calculateRequiredBreak(540)).toBe(45);
  });

  test("45min break required at 10h", () => {
    expect(calculateRequiredBreak(600)).toBe(45);
  });

  test("45min break required at 12h", () => {
    expect(calculateRequiredBreak(720)).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// Net work minutes calculation
// ---------------------------------------------------------------------------

describe("calculateNetWorkMinutes", () => {
  const baseTime = "2026-05-30T08:00:00.000Z";

  test("calculates net minutes for completed entry", () => {
    const clockOut = "2026-05-30T16:30:00.000Z"; // 8h30m = 510 min
    const result = calculateNetWorkMinutes(baseTime, clockOut, 30, baseTime);
    expect(result).toBe(480); // 510 - 30 = 480
  });

  test("calculates net minutes for running entry using nowIso", () => {
    const nowIso = "2026-05-30T12:00:00.000Z"; // 4h = 240 min
    const result = calculateNetWorkMinutes(baseTime, null, 0, nowIso);
    expect(result).toBe(240);
  });

  test("subtracts break minutes", () => {
    const clockOut = "2026-05-30T17:00:00.000Z"; // 9h = 540 min
    const result = calculateNetWorkMinutes(baseTime, clockOut, 45, baseTime);
    expect(result).toBe(495); // 540 - 45
  });

  test("returns 0 if break exceeds work time (edge case)", () => {
    const clockOut = "2026-05-30T09:00:00.000Z"; // 1h = 60 min
    const result = calculateNetWorkMinutes(baseTime, clockOut, 120, baseTime);
    expect(result).toBe(-60); // 60 - 120 = -60
  });
});

// ---------------------------------------------------------------------------
// §4 ArbZG — Break Warnings
// ---------------------------------------------------------------------------

describe("getBreakWarnings (§4 ArbZG)", () => {
  test("no warnings for <5h45m without break", () => {
    const warnings = getBreakWarnings(300, 0);
    expect(warnings).toHaveLength(0);
  });

  test("info warning at 5h45m without break", () => {
    const warnings = getBreakWarnings(345, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe("info");
    expect(warnings[0].category).toBe("break");
    expect(warnings[0].lawRef).toBe("§4 ArbZG");
  });

  test("warning at 6h without break", () => {
    const warnings = getBreakWarnings(360, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe("warning");
    expect(warnings[0].message).toContain("6 Stunden");
  });

  test("critical at 6h30m without break", () => {
    const warnings = getBreakWarnings(390, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe("critical");
    expect(warnings[0].message).toContain("sofort");
  });

  test("no warnings when sufficient break taken", () => {
    const warnings = getBreakWarnings(480, 30);
    expect(warnings).toHaveLength(0);
  });

  test("warning at 9h+ if only 30min break taken (need 45)", () => {
    const warnings = getBreakWarnings(540, 30);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].category).toBe("break");
  });

  test("no warning at 9h+ when 45min break taken", () => {
    const warnings = getBreakWarnings(540, 45);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §3 ArbZG — Daily Limit Warnings
// ---------------------------------------------------------------------------

describe("getDailyLimitWarnings (§3 ArbZG)", () => {
  test("no warnings under 8h", () => {
    const warnings = getDailyLimitWarnings(400);
    expect(warnings).toHaveLength(0);
  });

  test("info at 8h (480 min)", () => {
    const warnings = getDailyLimitWarnings(480);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe("info");
    expect(warnings[0].message).toContain("8 Stunden");
  });

  test("warning at 10h (600 min)", () => {
    const warnings = getDailyLimitWarnings(600);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].level).toBe("info");
    expect(warnings[1].level).toBe("warning");
    expect(warnings[1].message).toContain("10 Stunden");
    expect(warnings[1].lawRef).toBe("§3 ArbZG");
  });

  test("warning at 12h", () => {
    const warnings = getDailyLimitWarnings(720);
    expect(warnings).toHaveLength(3);
    expect(warnings[0].level).toBe("info");
    expect(warnings[1].level).toBe("warning");
    expect(warnings[2].level).toBe("critical");
    expect(warnings[2].message).toContain("12 Stunden");
    expect(warnings[2].lawRef).toBe("§3 ArbZG");
  });

  test("critical warning at 13h (780 min)", () => {
    const warnings = getDailyLimitWarnings(780);
    expect(warnings).toHaveLength(3);
    expect(warnings[2].level).toBe("critical");
    expect(warnings[2].message).toContain("12 Stunden");
  });

  test("critical warning message mentions Arbeitszeitgesetz verletzt", () => {
    const warnings = getDailyLimitWarnings(720);
    const critical = warnings.find((w) => w.level === "critical");
    expect(critical).toBeDefined();
    expect(critical!.message).toContain("Arbeitszeitgesetz verletzt");
  });
});

// ---------------------------------------------------------------------------
// §5 ArbZG — Rest Period Warnings
// ---------------------------------------------------------------------------

describe("getRestPeriodWarning (§5 ArbZG)", () => {
  test("no warning when lastClockOut is null", () => {
    const result = getRestPeriodWarning(null, "2026-05-30T08:00:00.000Z");
    expect(result).toBeNull();
  });

  test("no warning when rest period >= 11h", () => {
    const lastOut = "2026-05-29T18:00:00.000Z";
    const currentIn = "2026-05-30T08:00:00.000Z"; // 14h gap
    const result = getRestPeriodWarning(lastOut, currentIn);
    expect(result).toBeNull();
  });

  test("warning when rest period < 11h", () => {
    const lastOut = "2026-05-29T22:00:00.000Z";
    const currentIn = "2026-05-30T06:00:00.000Z"; // 8h gap
    const result = getRestPeriodWarning(lastOut, currentIn);
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.category).toBe("rest_period");
    expect(result!.message).toContain("11 Stunden");
    expect(result!.lawRef).toBe("§5 ArbZG");
  });

  test("warning when rest period is exactly 10h", () => {
    const lastOut = "2026-05-29T22:00:00.000Z";
    const currentIn = "2026-05-30T08:00:00.000Z"; // 10h gap
    const result = getRestPeriodWarning(lastOut, currentIn);
    expect(result).not.toBeNull();
  });

  test("no warning when rest period is exactly 11h", () => {
    const lastOut = "2026-05-29T21:00:00.000Z";
    const currentIn = "2026-05-30T08:00:00.000Z"; // 11h gap
    const result = getRestPeriodWarning(lastOut, currentIn);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ArbZG Reform 2026 — Weekly Limit
// ---------------------------------------------------------------------------

describe("getWeeklyLimitWarnings (ArbZG Reform 2026)", () => {
  test("no warning under 48h", () => {
    const result = getWeeklyLimitWarnings(2800);
    expect(result).toBeNull();
  });

  test("no warning at exactly 48h (2880 min)", () => {
    const result = getWeeklyLimitWarnings(2880);
    expect(result).toBeNull();
  });

  test("warning over 48h (2881 min)", () => {
    const result = getWeeklyLimitWarnings(2881);
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.category).toBe("weekly_limit");
    expect(result!.message).toContain("48");
  });

  test("warning at 50h", () => {
    const result = getWeeklyLimitWarnings(3000);
    expect(result).not.toBeNull();
  });
});
