import { z } from "zod";

/** Allowed MIME types for AU certificate uploads */
export const AU_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

/** Max AU certificate file size: 10 MB */
export const AU_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Entgeltfortzahlung period: 6 weeks = 42 calendar days */
export const ENTGELTFORTZAHLUNG_DAYS = 42;

export const createSickEntrySchema = z.object({
  employee_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum").nullable().optional(),
  notes: z.string().max(500).optional(),
}).refine((d) => {
  if (d.end_date && d.start_date > d.end_date) return false;
  return true;
}, { message: "Startdatum muss vor oder gleich dem Enddatum sein" });

export const updateSickEntrySchema = z.object({
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum").optional(),
  notes: z.string().max(500).optional(),
});

export type CreateSickEntryInput = z.infer<typeof createSickEntrySchema>;
export type UpdateSickEntryInput = z.infer<typeof updateSickEntrySchema>;
