/**
 * Unit tests for retentionService — data retention calculations.
 */

import { describe, test, expect } from "vitest";
import { calculateCutoffDate } from "@/services/retentionService";

describe("calculateCutoffDate", () => {
  test("returns date 730 days before input", () => {
    const cutoff = calculateCutoffDate("2026-06-03T12:00:00Z");
    expect(cutoff).toBe("2024-06-03");
  });

  test("handles leap year correctly", () => {
    // 2024 is a leap year. 2025-03-01 minus 730 days
    const cutoff = calculateCutoffDate("2025-03-01T12:00:00Z");
    expect(cutoff).toBe("2023-03-02");
  });

  test("cutoff is exactly 2 years before", () => {
    const cutoff = calculateCutoffDate("2028-01-01T00:00:00Z");
    // 730 days before 2028-01-01 = 2026-01-01
    expect(cutoff).toBe("2026-01-01");
  });
});
