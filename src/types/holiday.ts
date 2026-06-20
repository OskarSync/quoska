import { z } from "zod";

// ---------------------------------------------------------------------------
// Holiday Types
// ---------------------------------------------------------------------------

/** Result of checking if a date is a public holiday. */
export interface HolidayCheckResult {
  isHoliday: boolean;
  name: string | null;
}

/** Working day info for a specific date. */
export interface WorkingDayInfo {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  isWorkingDay: boolean;
}

/** Target hours calculation result for a week. */
export interface WeekTargetHours {
  workingDays: number;
  dailyTarget: number;
  weekTarget: number;
  holidays: WorkingDayInfo[];
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const holidayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss YYYY-MM-DD sein"),
  bundesland: z.string().min(1, "Bundesland ist erforderlich"),
});

export const weekQuerySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart muss YYYY-MM-DD sein"),
  weekEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekEnd muss YYYY-MM-DD sein"),
});

export type HolidayQueryInput = z.infer<typeof holidayQuerySchema>;
export type WeekQueryInput = z.infer<typeof weekQuerySchema>;
