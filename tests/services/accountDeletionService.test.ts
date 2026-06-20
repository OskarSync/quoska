/**
 * Unit tests for accountDeletionService — deletion date calculations.
 */

import { describe, test, expect } from "vitest";
import {
  calculateDeletionDate,
  isFinalWarningDate,
  isDeletionDue,
} from "@/services/accountDeletionService";

describe("calculateDeletionDate", () => {
  test("returns date 14 days after input", () => {
    const deletionDate = calculateDeletionDate("2026-06-03T12:00:00Z");
    expect(deletionDate).toBe("2026-06-17");
  });

  test("crosses month boundary", () => {
    const deletionDate = calculateDeletionDate("2026-06-20T12:00:00Z");
    expect(deletionDate).toBe("2026-07-04");
  });

  test("crosses year boundary", () => {
    const deletionDate = calculateDeletionDate("2026-12-25T12:00:00Z");
    expect(deletionDate).toBe("2027-01-08");
  });
});

describe("isFinalWarningDate", () => {
  test("returns true when exactly 7 days before deletion", () => {
    const result = isFinalWarningDate(
      "2026-06-17", // scheduled deletion
      "2026-06-10T12:00:00Z", // 7 days before
    );
    expect(result).toBe(true);
  });

  test("returns false when not 7 days before", () => {
    const result = isFinalWarningDate(
      "2026-06-17",
      "2026-06-11T12:00:00Z", // 6 days before
    );
    expect(result).toBe(false);
  });

  test("returns false when after deletion date", () => {
    const result = isFinalWarningDate(
      "2026-06-17",
      "2026-06-18T12:00:00Z",
    );
    expect(result).toBe(false);
  });
});

describe("isDeletionDue", () => {
  test("returns true when current date equals scheduled deletion", () => {
    const result = isDeletionDue("2026-06-17", "2026-06-17T12:00:00Z");
    expect(result).toBe(true);
  });

  test("returns true when current date is after scheduled deletion", () => {
    const result = isDeletionDue("2026-06-17", "2026-06-18T12:00:00Z");
    expect(result).toBe(true);
  });

  test("returns false when current date is before scheduled deletion", () => {
    const result = isDeletionDue("2026-06-17", "2026-06-16T12:00:00Z");
    expect(result).toBe(false);
  });
});
