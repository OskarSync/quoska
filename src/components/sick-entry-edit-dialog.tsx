/**
 * SickEntryEditDialog — Edit dialog for sick entries.
 * Extracted from SickEntryList to keep files under 300 lines.
 *
 * Uses key from parent to remount per entry, avoiding useEffect for state sync.
 */

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";

interface SickEntry {
  id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

interface SickEntryEditDialogProps {
  entry: SickEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SickEntryEditDialog({
  entry,
  open,
  onOpenChange,
}: SickEntryEditDialogProps) {
  const queryClient = useQueryClient();
  const [endDate, setEndDate] = useState(entry.end_date ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (endDate) body.end_date = endDate;
      if (notes !== (entry.notes ?? "")) body.notes = notes || null;

      const res = await fetch(`/api/v1/sick-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<unknown> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sickEntries"] });
      onOpenChange(false);
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit() {
    setError(null);

    if (!entry.end_date && !endDate) {
      setError(
        "Bitte gib ein Enddatum ein, um die Krankmeldung abzuschließen.",
      );
      return;
    }

    if (endDate && endDate < entry.start_date) {
      setError("Enddatum muss nach dem Startdatum liegen.");
      return;
    }

    mutation.mutate();
  }

  const hasChanges =
    endDate !== (entry.end_date ?? "") || notes !== (entry.notes ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Krankmeldung bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Von</span>
            <p className="text-sm">{fmtDate(entry.start_date)}</p>
          </div>

          <DatePicker
            id="edit-end-date"
            label={entry.end_date ? "Bis" : "Bis *"}
            value={endDate}
            onChange={setEndDate}
            placeholder="Enddatum wählen"
            minDate={entry.start_date}
          />
          {!entry.end_date && (
            <p className="text-xs text-muted-foreground -mt-2">
              Gib das Enddatum ein, um die laufende Krankmeldung abzuschließen.
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="edit-notes" className="text-sm font-medium">
              Notizen
            </label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!hasChanges || mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? "Speichern…" : "Speichern"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
