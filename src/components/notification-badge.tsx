/**
 * NotificationBadge — Shows unread notification count as a red badge.
 *
 * Used in sidebar and bottom-nav next to the Benachrichtigungen item.
 * Polls every 60 seconds for updated count.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface NotificationBadgeProps {
  /** Optional extra CSS classes */
  className?: string;
}

export function NotificationBadge({ className = "" }: NotificationBadgeProps) {
  const { data: count } = useQuery({
    queryKey: ["notificationUnreadCount"],
    queryFn: async () => {
      try {
        const res = await fetch(
          "/api/v1/notifications?limit=0&unread_only=true",
        );
        if (!res.ok) return 0;
        const json = await res.json();
        return (json.data as { count: number })?.count ?? 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const num = count ?? 0;

  if (num === 0) return null;

  return (
    <Badge
      variant="destructive"
      className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none ${className}`}
    >
      {num > 99 ? "99+" : num}
    </Badge>
  );
}
