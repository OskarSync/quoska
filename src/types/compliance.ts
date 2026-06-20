import { z } from "zod";

import type { BreakSession, TimeEntry } from "./database";

// ---------------------------------------------------------------------------
// ArbZG Compliance Warning Types
// ---------------------------------------------------------------------------

/** Warning severity levels for compliance alerts shown in the clock UI. */
export type WarningLevel = "info" | "warning" | "critical";

/** The category of ArbZG rule a warning relates to. */
export type ComplianceCategory =
  | "break"
  | "daily_limit"
  | "rest_period"
  | "weekly_limit";

/** A single compliance warning displayed to the user. */
export interface ComplianceWarning {
  level: WarningLevel;
  category: ComplianceCategory;
  /** German UI text describing the issue. */
  message: string;
  /** Legal reference, e.g. '§4 ArbZG'. */
  lawRef: string;
}

/** Full compliance status returned to the clock view. */
export interface ComplianceStatus {
  warnings: ComplianceWarning[];
  workMinutesToday: number;
  breakMinutesToday: number;
  weekMinutes: number;
}

// ---------------------------------------------------------------------------
// Zod Schemas — API Input Validation
// ---------------------------------------------------------------------------

export const clockInSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const clockOutSchema = z.object({
  timeEntryId: z.string().uuid(),
});

export const startBreakSchema = z.object({
  timeEntryId: z.string().uuid(),
});

export const endBreakSchema = z.object({
  breakSessionId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Inferred Input Types
// ---------------------------------------------------------------------------

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type StartBreakInput = z.infer<typeof startBreakSchema>;
export type EndBreakInput = z.infer<typeof endBreakSchema>;

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

/** Summary of today's time tracking for the clock UI. */
export interface TodaySummary {
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  netMinutes: number;
}

/** Summary of the current week's time tracking. */
export interface WeekSummary {
  totalMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
}

/** Clock status response returned by the API. */
export interface ClockStatusResponse {
  activeEntry: TimeEntry | null;
  activeBreak: BreakSession | null;
  compliance: ComplianceStatus;
  todaySummary: TodaySummary | null;
  weekSummary: WeekSummary;
  /** Cumulative surplus (+) or deficit (-) from previous days in the current month.
   *  Resets at the start of each month. Used to show a running balance. */
  monthCarryOverMinutes: number;
}
