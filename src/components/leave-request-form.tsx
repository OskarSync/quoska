/**
 * Leave Request Form — Submit a new leave request.
 */

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("urlaub");
  const [reason, setReason] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          type,
          reason: reason || undefined,
        }),
      });
      const json: ApiResponse<{ request: unknown; warning: string | null }> =
        await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Erstellen");
      return json;
    },
    onSuccess: (data) => {
      setWarning(data.data?.warning ?? null);
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
      if (!data.data?.warning) {
        resetForm();
        setOpen(false);
        onSuccess?.();
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function resetForm() {
    setStartDate("");
    setEndDate("");
    setType("urlaub");
    setReason("");
    setWarning(null);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    setWarning(null);
    if (!startDate || !endDate) {
      setError("Start- und Enddatum sind erforderlich");
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
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Urlaub beantragen
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Urlaub beantragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              id="start-date"
              label="Von"
              value={startDate}
              onChange={setStartDate}
              placeholder="Startdatum"
              maxDate={endDate || undefined}
            />
            <DatePicker
              id="end-date"
              label="Bis"
              value={endDate}
              onChange={setEndDate}
              placeholder="Enddatum"
              minDate={startDate || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Art</span>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v !== null) setType(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urlaub">Urlaub</SelectItem>
                <SelectItem value="sonderurlaub">Sonderurlaub</SelectItem>
                <SelectItem value="unbezahlt">Unbezahlter Urlaub</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-sm font-medium">
              Grund (optional)
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z.B. Familienurlaub"
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

          {warning && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-700 text-sm">
                ⚠️ {warning}
              </AlertDescription>
            </Alert>
          )}

          {warning ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Trotzdem senden
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? "Wird gesendet…" : "Antrag senden"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
