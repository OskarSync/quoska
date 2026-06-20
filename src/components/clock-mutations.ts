/**
 * Clock mutations — React Query mutation hooks for clock operations.
 *
 * Extracted from ClockView to keep file under 300 lines.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

function useClockMutations(
  activeEntry: { id: string } | null,
  activeBreak: { id: string } | null,
  selectedProjectId: string | null,
) {
  const queryClient = useQueryClient();
  const networkErrorMsg = "Verbindung fehlgeschlagen. Bitte versuche es erneut.";

  const clockInMutation = useMutation({
    mutationFn: async (notes?: string) => {
      let res;
      try {
        res = await fetch("/api/v1/clock/in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, projectId: selectedProjectId }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Einstempeln");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error("Kein aktiver Eintrag");
      let res;
      try {
        res = await fetch("/api/v1/clock/out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeEntryId: activeEntry.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Ausstempeln");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error("Kein aktiver Eintrag");
      let res;
      try {
        res = await fetch("/api/v1/clock/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeEntryId: activeEntry.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Starten der Pause");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!activeBreak) throw new Error("Keine aktive Pause");
      let res;
      try {
        res = await fetch("/api/v1/clock/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ breakSessionId: activeBreak.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Beenden der Pause");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const isProcessing =
    clockInMutation.isPending ||
    clockOutMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending;

  const error =
    clockInMutation.error?.message ??
    clockOutMutation.error?.message ??
    pauseMutation.error?.message ??
    resumeMutation.error?.message;

  return {
    clockInMutation,
    clockOutMutation,
    pauseMutation,
    resumeMutation,
    isProcessing,
    error,
  };
}

export { useClockMutations };
