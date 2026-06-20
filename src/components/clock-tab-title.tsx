/**
 * ClockTabTitle — reflects the live clock timer in the browser tab title.
 *
 * Mounted once in AppShell (so it runs on every /app/* page, including the
 * dedicated Stempeln page where the header widget is hidden). When the user is
 * clocked in, the tab shows a live stopwatch; when clocked out, it resets to a
 * clean default so we don't clobber Next.js page titles forever.
 *
 * Display only — uses the same useLiveElapsedSeconds hook (no authoritative
 * timestamps touched).
 */

"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import { useLiveElapsedSeconds, formatStopwatch } from "@/components/use-live-clock";

const APP_NAME = "Quoska";

export function ClockTabTitle() {
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
  const clockIn = activeEntry?.clock_in ?? null;
  const elapsed = useLiveElapsedSeconds(clockIn, activeEntry?.break_minutes ?? 0);

  // Remember the title we took over from, so we can restore it on clock-out.
  // Captured once, the first time we start overriding.
  const originalRef = useRef<string | null>(null);

  useEffect(() => {
    if (clockIn) {
      if (originalRef.current === null) {
        originalRef.current = document.title;
      }
      document.title = `${formatStopwatch(elapsed)} · ${APP_NAME}`;
    } else {
      // Restore the page title Next.js set, exactly once, then stop touching it.
      if (originalRef.current !== null) {
        document.title = originalRef.current;
        originalRef.current = null;
      }
    }
  }, [clockIn, elapsed]);

  return null;
}
