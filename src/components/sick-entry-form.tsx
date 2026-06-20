/**
 * Sick Entry Form — Create a new sick entry.
 */

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/date-picker";
import { Plus } from "lucide-react";
import type { ApiResponse } from "@/types/api";

interface SickEntryFormProps {
  employeeId?: string;
  onSuccess?: () => void;
}

export function SickEntryForm({ employeeId, onSuccess }: SickEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate || null,
        notes: notes || undefined,
      };
      if (employeeId) body.employee_id = employeeId;

      const res = await fetch("/api/v1/sick-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<unknown> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Erstellen");
      return json;
    },
    onSuccess: () => {
      resetForm();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sickEntries"] });
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function resetForm() {
    setStartDate("");
    setEndDate("");
    setNotes("");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!startDate) {
      setError("Startdatum ist erforderlich");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <Plus className="size-4" />
        Krankmeldung erfassen
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Krankmeldung erfassen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              id="sick-start"
              label="Von *"
              value={startDate}
              onChange={setStartDate}
              placeholder="Startdatum"
              maxDate={endDate || undefined}
            />
            <DatePicker
              id="sick-end"
              label="Bis (optional)"
              value={endDate}
              onChange={setEndDate}
              placeholder="Leer = fortlaufend"
              minDate={startDate || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sick-notes" className="text-sm font-medium">
              Notizen (optional)
            </label>
            <Textarea
              id="sick-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Arztbesuch am DD.MM."
              rows={2}
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Wird gespeichert…" : "Krankmeldung erfassen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
