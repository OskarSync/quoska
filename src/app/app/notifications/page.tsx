/**
 * /app/notifications — Notification inbox page.
 */

import { NotificationInbox } from "@/components/notification-inbox";

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-6">
      <NotificationInbox />
    </div>
  );
}
