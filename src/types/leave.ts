import { z } from "zod";
import type { LeaveRequest } from "./database";

export type LeaveType = LeaveRequest["type"];
export type LeaveRequestStatus = LeaveRequest["status"];

// eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Urlaubstage, nicht Arbeitsstunden
export const DEFAULT_VACATION_DAYS = 20;

export const BUNDESLAENDER_ENUM = [
  "baden-wuerttemberg", "bayern", "berlin", "brandenburg", "bremen",
  "hamburg", "hessen", "mecklenburg-vorpommern", "niedersachsen",
  "nordrhein-westfalen", "rheinland-pfalz", "saarland", "sachsen",
  "sachsen-anhalt", "schleswig-holstein", "thueringen",
] as const;

export const submitLeaveSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum (YYYY-MM-DD)"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum (YYYY-MM-DD)"),
  type: z.enum(["urlaub", "sonderurlaub", "unbezahlt"]).default("urlaub"),
  reason: z.string().max(500).optional(),
}).refine((d) => d.start_date <= d.end_date, { message: "Startdatum muss vor oder gleich dem Enddatum sein" });

export const reviewLeaveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  review_note: z.string().max(500).optional(),
});

/* eslint-disable @quoska/legal/enforce-max-working-hours -- Urlaubstage, nicht Arbeitsstunden */
export const updateEntitlementSchema = z.object({
  total_days: z.number().int().min(20, "Mindestens 20 Tage (BUrlG)").max(40),
  carried_over: z.number().int().min(0).max(20).default(0),
});
/* eslint-enable @quoska/legal/enforce-max-working-hours */

export interface LeaveBalance {
  total: number;
  used: number;
  pending: number;
  available: number;
  carried_over: number;
}

export type SubmitLeaveInput = z.infer<typeof submitLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
export type UpdateEntitlementInput = z.infer<typeof updateEntitlementSchema>;
