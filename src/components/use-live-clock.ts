/**
 * useLiveElapsedSeconds — a display-only live timer for the active clock entry.
 *
 * Returns the net worked seconds since clock_in (minus completed break minutes),
 * updating once per second for a live stopwatch feel.
 *
 * LEGAL NOTE (§16 ArbZG): this is DISPLAY ONLY. The authoritative timestamp is
 * the server-generated clock_in; we only use Date.now() client-side to render a
 * ticking duration, never to record time. Hence the eslint-disable on Date.now
 * (mirrors the Stempeln page's live counter in clock-view.tsx).
 */

"use client";

import { useEffect, useState } from "react";

/** H:MM:SS stopwatch format (e.g. 0:00:00, 1:23:45, 12:05:09). */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * @param clockInIso  ISO timestamp of the active entry's clock_in (null = off)
 * @param breakMinutes accumulated completed break minutes for the entry
 */
export function useLiveElapsedSeconds(
  clockInIso: string | null | undefined,
  breakMinutes: number,
): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!clockInIso) {
      // No active entry: leave `seconds` as-is. Callers only render the timer
      // when an entry exists, so a stale value is never shown; and we avoid a
      // synchronous setState in the effect body (cascading-render lint rule).
      return;
    }
    const clockInMs = Date.parse(clockInIso);
    const breakSec = (breakMinutes ?? 0) * 60;

    const tick = () => {
      // eslint-disable-next-line @quoska/legal/no-client-timestamps
      const nowMs = Date.now();
      setSeconds(Math.max(0, Math.round((nowMs - clockInMs) / 1000) - breakSec));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockInIso, breakMinutes]);

  return seconds;
}
