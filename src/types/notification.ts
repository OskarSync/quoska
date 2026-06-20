import { z } from "zod";

/** Notification types used throughout the system. */
export type NotificationType =
  | "forgot_clockout"
  | "break_reminder"
  | "correction_request"
  | "correction_approved"
  | "correction_rejected";

/** Map notification type to display icon. */
export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  forgot_clockout: "⏰",
  break_reminder: "☕",
  correction_request: "📝",
  correction_approved: "✅",
  correction_rejected: "❌",
};

/** Query params for listing notifications. */
export const notificationListSchema = z.object({
  limit: z.coerce.number().int().min(0).max(100).optional().default(50),
  unread_only: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
});

export type NotificationListInput = z.infer<typeof notificationListSchema>;

/** Schema for marking a notification as read. */
export const markReadSchema = z.object({
  id: z.string().uuid("Ungültige Benachrichtigungs-ID"),
});

/** Schema for read-all action. */
export const readAllSchema = z.object({
  action: z.literal("read_all"),
});
