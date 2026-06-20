import { z } from "zod";

export const setupCompanySchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  bundesland: z.string().min(1, "Bundesland ist erforderlich"),
});

export type SetupCompanyInput = z.infer<typeof setupCompanySchema>;

export const inviteEmployeeSchema = z.object({
  employees: z
    .array(
      z.object({
        firstName: z.string().min(1, "Vorname erforderlich"),
        lastName: z.string().min(1, "Nachname erforderlich"),
        email: z.string().email("Ungültige E-Mail"),
      }),
    )
    .min(0)
    .max(2, "Maximal 2 weitere Mitarbeiter im kostenlosen Tarif"),
});

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
