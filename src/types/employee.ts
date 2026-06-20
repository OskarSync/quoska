import { z } from "zod";
import type { Employee } from "./database";

export type Role = Employee["role"];

/** Free plan employee limit (for plan enforcement) */
export const FREE_PLAN_EMPLOYEE_LIMIT = 3;

export type EmployeeInsert = Pick<
  Employee,
  | "tenant_id"
  | "user_id"
  | "first_name"
  | "last_name"
  | "email"
  | "role"
  | "target_hours_week"
  | "bundesland"
  | "invitation_token"
>;

export const inviteEmployeeSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  targetHoursWeek: z.number().gt(0).max(48).default(40),
  bundesland: z
    .enum([
      "baden-wuerttemberg",
      "bayern",
      "berlin",
      "brandenburg",
      "bremen",
      "hamburg",
      "hessen",
      "mecklenburg-vorpommern",
      "niedersachsen",
      "nordrhein-westfalen",
      "rheinland-pfalz",
      "saarland",
      "sachsen",
      "sachsen-anhalt",
      "schleswig-holstein",
      "thueringen",
    ])
    .nullable()
    .default(null),
});

export const updateEmployeeSchema = z.object({
  first_name: z.string().min(1, "Vorname ist erforderlich").optional(),
  last_name: z.string().min(1, "Nachname ist erforderlich").optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  target_hours_week: z.number().gt(0).max(48).optional(),
  bundesland: z
    .enum([
      "baden-wuerttemberg",
      "bayern",
      "berlin",
      "brandenburg",
      "bremen",
      "hamburg",
      "hessen",
      "mecklenburg-vorpommern",
      "niedersachsen",
      "nordrhein-westfalen",
      "rheinland-pfalz",
      "saarland",
      "sachsen",
      "sachsen-anhalt",
      "schleswig-holstein",
      "thueringen",
    ])
    .nullable()
    .optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
