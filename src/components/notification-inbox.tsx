/**
 * NotificationInbox — Full notification list with read/mark-all actions.
 *
 * Shows all notifications: unread first, then read, sorted by date.
 * Supports polling, mark-read on click, and "Alle gelesen" bulk action.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/database";
import type { NotificationType } from "@/types/notification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  AlarmClock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";

/** Local icon map overriding the emoji-based NOTIFICATION_ICON from types. */
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  forgot_clockout: AlarmClock,
  break_reminder: Clock,
  correction_request: AlertTriangle,
  correction_approved: CheckCircle,
  correction_rejected: XCircle,
};

function getNotificationIcon(type: string): LucideIcon {
  return LUCIDE_ICON_MAP[type] ?? Bell;
}

function getNotificationIconBg(type: string): string {
  if (type.startsWith("correction_approved")) return "bg-green-50 text-green-600";
  if (type.startsWith("correction_rejected")) return "bg-red-50 text-red-500";
  if (type.startsWith("correction_request")) return "bg-amber-50 text-amber-600";
  if (type === "forgot_clockout") return "bg-blue-50 text-primary";
  if (type === "break_reminder") return "bg-purple-50 text-purple-600";
  return "bg-blue-50 text-primary";
}

/** Format a relative time string like "vor 2 Stunden" */
// formatRelativeTime: Display-only relative time. Not a legal timestamp.
function formatRelativeTime(isoDate: string): string {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  const diffMs = Date.now() - Date.parse(isoDate);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `vor ${minutes} Minute${minutes === 1 ? "" : "n"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Stunde${hours === 1 ? "" : "n"}`;

  const days = Math.floor(hours / 24); // eslint-disable-line @quoska/legal/enforce-max-working-hours
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export function NotificationInbox() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data as Notification[]) ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "PATCH",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-blue-50 text-primary mb-4">
          <Bell className="size-6" />
        </div>
        <p className="text-muted-foreground">
          Keine Benachrichtigungen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with mark-all button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Benachrichtigungen
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button
            variant="link"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            Alle gelesen
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="rounded-xl border bg-white shadow-sm">
        {notifications.map((notification, index) => {
          const IconComponent = getNotificationIcon(notification.type as NotificationType);
          const iconBg = getNotificationIconBg(notification.type);
          const isUnread = !notification.read;

          return (
            <div key={notification.id}>
              {index > 0 && <Separator />}
              <button
                onClick={() => {
                  if (isUnread) {
                    markReadMutation.mutate(notification.id);
                  }
                }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/50 ${
                  isUnread ? "bg-primary/5" : "opacity-60"
                }`}
              >
                <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5 ${iconBg}`}>
                  <IconComponent className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {notification.title}
                    </p>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
