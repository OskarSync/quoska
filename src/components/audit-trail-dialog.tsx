/**
 * AuditTrailDialog — Shows the full change history for a time entry.
 *
 * Displays all audit records in chronological order with:
 * timestamp, who changed it, action, field, old → new, reason.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { TimeEntryAudit } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditTrailDialogProps {
  timeEntryId: string;
  open: boolean;
  onClose: () => void;
}

/** Format ISO timestamp to German date + time using Date.parse only. */
function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  const totalMinutes = Math.floor(ms / 60000);
  const dayMinutes = totalMinutes % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;
  // Extract date part from ISO string directly
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-");
  return `${d}.${m}.${y}, ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Human-readable action labels. */
const ACTION_LABELS: Record<string, string> = {
  create: "Erstellt",
  update: "Bearbeitet",
  delete: "Gelöscht",
  pause: "Pause gestartet",
  resume: "Pause beendet",
};

/** Human-readable field labels. */
const FIELD_LABELS: Record<string, string> = {
  clock_in: "Einstempeln",
  clock_out: "Ausstempeln",
  break_minutes: "Pause (Min)",
  notes: "Notizen",
  status: "Status",
};

export function AuditTrailDialog({
  timeEntryId,
  open,
  onClose,
}: AuditTrailDialogProps) {
  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ["auditTrail", timeEntryId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/time-entries/${timeEntryId}`);
      const json: ApiResponse<TimeEntryAudit[]> = await res.json();
      return json.data ?? [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verlauf</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          {isLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {auditTrail && auditTrail.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Kein Verlauf vorhanden.
            </p>
          )}

          {auditTrail && auditTrail.length > 0 && (
            <div className="space-y-4">
              {auditTrail.map((record) => (
                <div
                  key={record.id}
                  className="flex gap-3 text-sm"
                >
                  <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium">
                        {ACTION_LABELS[record.action] ?? record.action}
                      </span>
                      {record.field_name && (
                        <span className="text-muted-foreground">
                          · {FIELD_LABELS[record.field_name] ?? record.field_name}
                        </span>
                      )}
                    </div>

                    {record.old_value !== null && record.new_value !== null && (
                      <p className="text-muted-foreground mt-0.5">
                        <span className="line-through">{record.old_value}</span>
                        {" → "}
                        <span className="font-medium">{record.new_value}</span>
                      </p>
                    )}

                    {record.reason && (
                      <p className="text-muted-foreground mt-0.5 italic">
                        &quot;{record.reason}&quot;
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(record.changed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="w-full" />}>
            Schließen
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
