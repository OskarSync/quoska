/**
 * Team Status List — Shows each employee's current status
 * with compliance warnings.
 */

"use client";

import type { ComplianceWarning } from "@/types/compliance";
import { Separator } from "@/components/ui/separator";

interface TeamMemberStatus {
  employeeId: string;
  firstName: string;
  lastName: string;
  bundesland: string | null;
  status: "running" | "paused" | "off";
  since: string | null;
  todayNetMinutes: number;
  warnings: ComplianceWarning[];
}

interface TeamStatusListProps {
  members: TeamMemberStatus[];
}

/** Format minutes as "X Std Y Min". */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

function StatusDot({ status }: { status: TeamMemberStatus["status"] }) {
  if (status === "running") {
    return (
      <span title="Eingestempelt" className="flex items-center justify-center size-8 rounded-full bg-green-50">
        <span className="size-2.5 rounded-full bg-green-500" />
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span title="Pause" className="flex items-center justify-center size-8 rounded-full bg-amber-50">
        <span className="size-2.5 rounded-full bg-amber-500" />
      </span>
    );
  }
  return (
    <span title="Ausgestempelt" className="flex items-center justify-center size-8 rounded-full bg-slate-50">
      <span className="size-2.5 rounded-full bg-slate-300" />
    </span>
  );
}

export function TeamStatusList({ members }: TeamStatusListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center shadow-sm bg-white">
        <p className="text-muted-foreground">Keine Mitarbeiter gefunden.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {members.map((member, index) => (
        <div key={member.employeeId}>
          {index > 0 && <Separator />}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot status={member.status} />
                <div>
                  <p className="text-sm font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.status === "running" && member.since && (
                      <>Eingestempelt seit {member.since.slice(11, 16)} · </>
                    )}
                    {member.status === "paused" && "In Pause · "}
                    Heute: {formatDuration(member.todayNetMinutes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Show warnings inline */}
            {member.warnings.length > 0 && (
              <div className="mt-2 ml-11">
                {member.warnings.map((w, i) => (
                  <p
                    key={i}
                    className={`text-xs ${
                      w.level === "critical"
                        ? "text-destructive"
                        : w.level === "warning"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
