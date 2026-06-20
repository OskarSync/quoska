/**
 * Unit tests for holidayService — holiday calculations, working days,
 * target hours.
 */

import { describe, test, expect } from "vitest";
import {
  isWeekend,
  isWorkingDay,
  addDays,
  getWeekMonday,
  getWeekSunday,
  holidaysToMap,
  holidaysToSet,
  calculateWeekTargetHours,
} from "@/services/holidayService";
import type { PublicHoliday } from "@/types/database";

// ---------------------------------------------------------------------------
// Weekend detection
// ---------------------------------------------------------------------------

describe("isWeekend", () => {
  test("Saturday is weekend", () => {
    // 2026-06-06 is a Saturday
    expect(isWeekend("2026-06-06")).toBe(true);
  });

  test("Sunday is weekend", () => {
    // 2026-06-07 is a Sunday
    expect(isWeekend("2026-06-07")).toBe(true);
  });

  test("Monday is not weekend", () => {
    // 2026-06-01 is a Monday
    expect(isWeekend("2026-06-01")).toBe(false);
  });

  test("Friday is not weekend", () => {
    // 2026-06-05 is a Friday
    expect(isWeekend("2026-06-05")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Working day check
// ---------------------------------------------------------------------------

describe("isWorkingDay", () => {
  test("weekday without holiday is working day", () => {
    expect(isWorkingDay("2026-06-01", new Set())).toBe(true);
  });

  test("weekend is not working day", () => {
    expect(isWorkingDay("2026-06-06", new Set())).toBe(false);
  });

  test("weekday with holiday is not working day", () => {
    // Oct 3 is Tag der Deutschen Einheit (Saturday in 2026)
    // Let's use Oct 1 (Thursday) with a fake holiday
    expect(isWorkingDay("2026-10-01", new Set(["2026-10-01"]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Date arithmetic
// ---------------------------------------------------------------------------

describe("addDays", () => {
  test("add 1 day", () => {
    expect(addDays("2026-06-01", 1)).toBe("2026-06-02");
  });

  test("add 0 days returns same date", () => {
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
  });

  test("add days crossing month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  test("add days crossing year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("subtract days", () => {
    expect(addDays("2026-06-05", -4)).toBe("2026-06-01");
  });
});

describe("getWeekMonday", () => {
  test("Monday returns itself", () => {
    // 2026-06-01 is a Monday
    expect(getWeekMonday("2026-06-01")).toBe("2026-06-01");
  });

  test("Wednesday returns Monday of same week", () => {
    // 2026-06-03 is a Wednesday
    expect(getWeekMonday("2026-06-03")).toBe("2026-06-01");
  });

  test("Sunday returns Monday of same week", () => {
    // 2026-06-07 is a Sunday
    expect(getWeekMonday("2026-06-07")).toBe("2026-06-01");
  });
});

describe("getWeekSunday", () => {
  test("Monday returns Sunday of same week", () => {
    expect(getWeekSunday("2026-06-01")).toBe("2026-06-07");
  });

  test("Sunday returns itself", () => {
    expect(getWeekSunday("2026-06-07")).toBe("2026-06-07");
  });
});

// ---------------------------------------------------------------------------
// Holiday conversion utilities
// ---------------------------------------------------------------------------

describe("holidaysToMap", () => {
  test("converts holiday array to map", () => {
    const holidays: PublicHoliday[] = [
      { id: "1", date: "2026-10-03", name: "Tag der Deutschen Einheit", bundesland: "all", created_at: "" },
      { id: "2", date: "2026-12-25", name: "1. Weihnachtsfeiertag", bundesland: "all", created_at: "" },
    ];

    const map = holidaysToMap(holidays);
    expect(map.get("2026-10-03")).toBe("Tag der Deutschen Einheit");
    expect(map.get("2026-12-25")).toBe("1. Weihnachtsfeiertag");
    expect(map.size).toBe(2);
  });

  test("deduplicates same date (keeps first)", () => {
    const holidays: PublicHoliday[] = [
      { id: "1", date: "2026-10-03", name: "Tag der Deutschen Einheit", bundesland: "all", created_at: "" },
      { id: "2", date: "2026-10-03", name: "Some other", bundesland: "berlin", created_at: "" },
    ];

    const map = holidaysToMap(holidays);
    expect(map.get("2026-10-03")).toBe("Tag der Deutschen Einheit");
    expect(map.size).toBe(1);
  });
});

describe("holidaysToSet", () => {
  test("converts holiday array to set of dates", () => {
    const holidays: PublicHoliday[] = [
      { id: "1", date: "2026-10-03", name: "TDE", bundesland: "all", created_at: "" },
      { id: "2", date: "2026-12-25", name: "Weihnachten", bundesland: "all", created_at: "" },
    ];

    const set = holidaysToSet(holidays);
    expect(set.has("2026-10-03")).toBe(true);
    expect(set.has("2026-12-25")).toBe(true);
    expect(set.has("2026-01-01")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Target hours calculation
// ---------------------------------------------------------------------------

describe("calculateWeekTargetHours", () => {
  test("full week with no holidays = 40h for 40h/week", () => {
    // Week of 2026-06-01 (Mon) to 2026-06-07 (Sun) — no holidays
    const result = calculateWeekTargetHours(
      "2026-06-01",
      new Map(),
      40,
    );
    expect(result.workingDays).toBe(5);
    expect(result.weekTarget).toBe(40);
    expect(result.dailyTarget).toBe(8);
  });

  test("week with one holiday = 32h for 40h/week", () => {
    // Tag der Deutschen Einheit is Oct 3 (Saturday in 2026)
    // Use a week with a Thursday holiday
    const holidayMap = new Map([["2026-06-04", "Testfeiertag"]]);
    const result = calculateWeekTargetHours(
      "2026-06-01",
      holidayMap,
      40,
    );
    expect(result.workingDays).toBe(4);
    expect(result.weekTarget).toBe(32);
  });

  test("week with two holidays = 24h for 40h/week", () => {
    const holidayMap = new Map([
      ["2026-06-02", "Feiertag 1"],
      ["2026-06-03", "Feiertag 2"],
    ]);
    const result = calculateWeekTargetHours(
      "2026-06-01",
      holidayMap,
      40,
    );
    expect(result.workingDays).toBe(3);
    expect(result.weekTarget).toBe(24);
  });

  test("all weekdays are holidays = 0h", () => {
    const holidayMap = new Map([
      ["2026-06-01", "H1"],
      ["2026-06-02", "H2"],
      ["2026-06-03", "H3"],
      ["2026-06-04", "H4"],
      ["2026-06-05", "H5"],
    ]);
    const result = calculateWeekTargetHours(
      "2026-06-01",
      holidayMap,
      40,
    );
    expect(result.workingDays).toBe(0);
    expect(result.weekTarget).toBe(0);
  });

  test("custom weekly target hours scale correctly", () => {
    const result = calculateWeekTargetHours(
      "2026-06-01",
      new Map(),
      30, // 30h/week = 6h/day
    );
    expect(result.workingDays).toBe(5);
    expect(result.weekTarget).toBe(30);
    expect(result.dailyTarget).toBe(6);
  });
});
