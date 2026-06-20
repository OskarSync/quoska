/**
 * TimeEntryEditDialog — Manager edit dialog for time entries.
 *
 * Allows managers to edit clock_in, clock_out, break_minutes, notes
 * with a mandatory reason field (min 5 chars).
 * Shows audit trail via AuditTrailDialog.
 */

"use client";

import { useState } from "react";
import type { TimeEntry } from "@/types/database";
import { AuditTrailDialog } from "@/components/audit-trail-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeEntryEditDialogProps {
  entry: TimeEntry;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Format ISO timestamp to datetime-local input value using Date.parse only. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Extract parts from ISO string directly
  const datePart = iso.slice(0, 10);
  const timePart = iso.slice(11, 16); // HH:MM
  return `${datePart}T${timePart}`;
}

export function TimeEntryEditDialog({
  entry,
  open,
  onClose,
  onSaved,
}: TimeEntryEditDialogProps) {
  const [clockIn, setClockIn] = useState(toDatetimeLocal(entry.clock_in));
  const [clockOut, setClockOut] = useState(toDatetimeLocal(entry.clock_out));
  const [breakMinutes, setBreakMinutes] = useState(String(entry.break_minutes));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const handleSave = async () => {
    setError(null);

    if (reason.trim().length < 5) {
      setError("Ein Grund ist erforderlich (mindestens 5 Zeichen)");
      return;
    }

    setIsSaving(true);

    try {
      const changes: Record<string, unknown> = {};

      if (clockIn !== toDatetimeLocal(entry.clock_in)) {
        // Convert datetime-local (YYYY-MM-DDTHH:MM) to ISO format
        changes.clock_in = `${clockIn}:00.000Z`;
      }
      if (clockOut !== toDatetimeLocal(entry.clock_out)) {
        changes.clock_out = clockOut ? `${clockOut}:00.000Z` : null;
      }
      if (parseInt(breakMinutes) !== entry.break_minutes) {
        changes.break_minutes = parseInt(breakMinutes) || 0;
      }
      if (notes !== (entry.notes ?? "")) {
        changes.notes = notes || null;
      }

      if (Object.keys(changes).length === 0) {
        setError("Keine Änderungen erkannt");
        setIsSaving(false);
        return;
      }

      const res = await fetch(`/api/v1/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...changes, reason: reason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Fehler beim Speichern");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AuditTrailDialog
        timeEntryId={entry.id}
        open={showAudit}
        onClose={() => setShowAudit(false)}
      />
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Einstempeln</Label>
              <Input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ausstempeln</Label>
              <Input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pause (Minuten)</Label>
              <Input
                type="number"
                min="0"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Grund <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="z.B. Uhrenabweichung korrigiert"
              />
              {reason.length > 0 && reason.length < 5 && (
                <p className="text-xs text-destructive mt-1">
                  Mindestens 5 Zeichen erforderlich
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="link"
              onClick={() => setShowAudit(true)}
              className="px-0"
            >
              Verlauf anzeigen →
            </Button>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
