import { z } from "zod";

export const registerInputSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  employee_id: string;
  role: "admin" | "manager" | "employee";
}
