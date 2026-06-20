import { z } from "zod";

/** Schema for manager time entry edit input. */
export const editTimeEntrySchema = z.object({
  clock_in: z.string().datetime().optional(),
  clock_out: z.string().datetime().nullable().optional(),
  break_minutes: z.number().int().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  reason: z.string().min(5, "Ein Grund ist erforderlich (mindestens 5 Zeichen)"),
});

export type EditTimeEntryInput = z.infer<typeof editTimeEntrySchema>;

/** Schema for correction request submission. */
export const submitCorrectionSchema = z.object({
  time_entry_id: z.string().uuid(),
  proposed_change: z.object({
    clock_in: z.string().datetime().optional(),
    clock_out: z.string().datetime().nullable().optional(),
    break_minutes: z.number().int().min(0).optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
  reason: z.string().min(1, "Ein Grund ist für die Korrektur erforderlich"),
});

export type SubmitCorrectionInput = z.infer<typeof submitCorrectionSchema>;

/** Schema for correction request review. */
export const reviewCorrectionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  review_note: z.string().max(500).optional(),
});

export type ReviewCorrectionInput = z.infer<typeof reviewCorrectionSchema>;
