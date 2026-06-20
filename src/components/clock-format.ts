/**
 * Clock view formatting helpers — pure functions.
 * Shared between the main ClockView and its presentational sub-components.
 */

/** Format signed minutes as "+X Std Y Min" / "-X Std Y Min". */
export function formatBalance(minutes: number): string {
  if (minutes === 0) return "0 Min";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes < 0 ? "-" : "+";
  if (h === 0) return `${sign}${m} Min`;
  return `${sign}${h} Std ${m} Min`;
}

/** Format absolute minutes as "X Std Y Min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

/** Format absolute minutes as compact "Xh Ym". */
export function formatDurationCompact(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
