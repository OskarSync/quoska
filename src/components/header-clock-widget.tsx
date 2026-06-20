/**
 * HeaderClockWidget — compact clock in/out control for the global app header.
 *
 * Reuses the existing clock API endpoints via useClockMutations. Kept compact
 * (icon-led buttons) so it fits a 56px header. Intended for every /app/* page
 * EXCEPT /app/clock, which already has the full stamp button — rendering it
 * there would duplicate the "Stempeln" button and break that page's tests.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import { useClockMutations } from "@/components/clock-mutations";
import { Button } from "@/components/ui/button";
import { Play, Square, Coffee } from "lucide-react";

type Optimistic = "clock-in" | "clock-out" | "pause" | "resume" | null;

export function HeaderClockWidget() {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<Optimistic>(null);

  const { data: status } = useQuery({
    queryKey: ["clockStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/clock/status");
      const json: ApiResponse<ClockStatusResponse> = await res.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const activeEntry = status?.activeEntry ?? null;
  const activeBreak = status?.activeBreak ?? null;

  const {
    clockInMutation,
    clockOutMutation,
    pauseMutation,
    resumeMutation,
    isProcessing,
    error,
  } = useClockMutations(activeEntry, activeBreak, null);

  // Effective state honours optimistic overrides so the button reflects the
  // just-pressed action immediately (matches the Stempeln page's behavior).
  const showClockedIn =
    optimistic === "clock-in" ||
    optimistic === "resume" ||
    (!!activeEntry?.status && activeEntry.status === "running" && !activeBreak && optimistic !== "clock-out");
  const showPaused = optimistic === "pause" || (!!activeBreak && optimistic !== "resume");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["presence"] });
  const wrap = (
    fn: () => void,
    op: Exclude<Optimistic, null>,
    mutate: { mutate: (arg: undefined, opts?: object) => void },
  ) => {
    setOptimistic(op);
    mutate.mutate(undefined, {
      onSuccess: () => {
        setOptimistic(null);
        refresh();
      },
      onError: () => setOptimistic(null),
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="hidden sm:inline text-xs text-destructive max-w-[12rem] truncate">
          {error}
        </span>
      )}

      {/* Pause / resume — secondary, only while clocked in */}
      {showClockedIn && !showPaused && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => wrap(() => {}, "pause", pauseMutation)}
          disabled={isProcessing && !optimistic}
          aria-label="Pause starten"
          title="Pause starten"
          className="size-8"
        >
          <Coffee className="size-4" />
        </Button>
      )}
      {showPaused && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => wrap(() => {}, "resume", resumeMutation)}
          disabled={isProcessing && !optimistic}
          aria-label="Pause beenden"
          title="Pause beenden"
          className="size-8"
        >
          <Play className="size-4" />
        </Button>
      )}

      {/* Primary clock in / out */}
      {showClockedIn || showPaused ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => wrap(() => {}, "clock-out", clockOutMutation)}
          disabled={isProcessing && !optimistic}
          className="gap-1.5"
        >
          <Square className="size-4" />
          <span className="hidden sm:inline">Ausstempeln</span>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => wrap(() => {}, "clock-in", clockInMutation)}
          disabled={isProcessing && !optimistic}
          className="gap-1.5"
        >
          <Play className="size-4" />
          <span className="hidden sm:inline">Stempeln</span>
        </Button>
      )}
    </div>
  );
}
