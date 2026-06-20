/**
 * EmployeeEntryList — Drill-down view for a single employee's time entries.
 *
 * Shows individual entries with "Bearbeiten" and "Verlauf" buttons.
 * Wired to TimeEntryEditDialog and AuditTrailDialog.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";
import { AuditTrailDialog } from "@/components/audit-trail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeEntryWithNet extends TimeEntry {
  netMinutes: number;
}

interface EmployeeEntriesData {
  entries: TimeEntryWithNet[];
}

interface EmployeeEntryListProps {
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  onBack: () => void;
}

/** Format ISO date to DD.MM.YYYY. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** Format ISO time to HH:MM. */
function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** Format minutes to "X Std Y Min". */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

export function EmployeeEntryList({
  employeeId,
  employeeName,
  startDate,
  endDate,
  onBack,
}: EmployeeEntryListProps) {
  const queryClient = useQueryClient();
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [auditEntryId, setAuditEntryId] = useState<string | null>(null);

  const { data } = useQuery<EmployeeEntriesData>({
    queryKey: ["employeeEntries", employeeId, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/time-entries?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
      );
      const json: ApiResponse<EmployeeEntriesData> = await res.json();
      return json.data!;
    },
  });

  return (
    <div>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Zurück
        </Button>
        <div>
          <h3 className="text-lg font-semibold">{employeeName}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
        </div>
      </div>

      {/* Loading */}
      {!data && (
        <div className="flex items-center justify-center py-8">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {data && data.entries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Keine Zeiteinträge in diesem Zeitraum.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entry list */}
      {data && data.entries.length > 0 && (
        <div className="rounded-lg border">
          {data.entries.map((entry, index) => (
            <div key={entry.id}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {formatDate(entry.date)}
                    </p>
                    {entry.status === "running" && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-0">
                        Läuft
                      </Badge>
                    )}
                    {entry.status === "paused" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0">
                        Pause
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(entry.clock_in)}
                    {entry.clock_out
                      ? ` – ${formatTime(entry.clock_out)}`
                      : " – …"}
                    {entry.break_minutes > 0 &&
                      ` · Pause: ${entry.break_minutes} Min`}
                    {" · Netto: "}
                    {formatDuration(entry.netMinutes)}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {entry.status === "completed" && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => setEditEntry(entry)}
                    >
                      Bearbeiten
                    </Button>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setAuditEntryId(entry.id)}
                  >
                    Verlauf
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editEntry && (
        <TimeEntryEditDialog
          entry={editEntry}
          open={!!editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => {
            setEditEntry(null);
            queryClient.invalidateQueries({
              queryKey: ["employeeEntries", employeeId],
            });
            queryClient.invalidateQueries({ queryKey: ["weeklyReport"] });
          }}
        />
      )}

      {/* Audit trail dialog */}
      {auditEntryId && (
        <AuditTrailDialog
          timeEntryId={auditEntryId}
          open={!!auditEntryId}
          onClose={() => setAuditEntryId(null)}
        />
      )}
    </div>
  );
}
