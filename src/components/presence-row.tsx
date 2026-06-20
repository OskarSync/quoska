/**
 * PresenceRow — a single team-member attendance row.
 *
 * Shared presentational component used by the presence panel. Shows a status
 * dot, the name, the role badge, the clock-in time, today's net minutes, and
 * a right-aligned status label. The current user's row is highlighted.
 *
 * Presence only (no compliance warnings) — colleagues see attendance, not
 * each other's ArbZG flags (DSGVO-conscious split).
 */

import type { Role } from "@/types";
import { formatTimeLocal } from "@/config/client/date-utils";

export interface PresenceMember {
  employeeId: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: "running" | "paused" | "off";
  /** ISO timestamp of the active entry's clock_in, or null when off. */
  since: string | null;
  todayNetMinutes: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "",
};

export function PresenceRow({ m, isMe }: { m: PresenceMember; isMe: boolean }) {
  const running = m.status === "running";
  const paused = m.status === "paused";

  const dot = running ? "bg-green-500" : paused ? "bg-amber-500" : "bg-slate-300";
  const wrap = running ? "bg-green-50" : paused ? "bg-amber-50" : "bg-slate-50";
  const statusLabel = running ? "Eingestempelt" : paused ? "Pause" : "Ausgestempelt";

  return (
    <div
      data-testid="presence-row"
      className={`flex items-center justify-between px-4 py-3 ${
        isMe ? "bg-violet-50/60" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`flex items-center justify-center size-8 rounded-full shrink-0 ${wrap}`}
          title={statusLabel}
        >
          <span className={`size-2.5 rounded-full ${dot}`} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {m.firstName} {m.lastName}
            {isMe && (
              <span className="ml-2 text-[11px] font-semibold text-violet-600">
                Du
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {ROLE_BADGE[m.role] ? `${ROLE_BADGE[m.role]} · ` : ""}
            {running && m.since
              ? `Eingestempelt seit ${formatTimeLocal(m.since)} · `
              : paused
                ? "Pause · "
                : ""}
            Heute: {formatDuration(m.todayNetMinutes)}
          </p>
        </div>
      </div>
      <span
        className={`text-xs font-medium shrink-0 ml-3 ${
          running ? "text-green-700" : paused ? "text-amber-700" : "text-muted-foreground"
        }`}
      >
        {statusLabel}
      </span>
    </div>
  );
}
