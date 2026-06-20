/**
 * Server-side document metadata (dates, build version).
 *
 * This file lives under `src/config/server/` so the
 * `@quoska/legal/no-client-timestamps` ESLint rule treats every `new Date()`
 * here as explicitly server-generated (it is — these values are computed at
 * server render / build time, never on the client).
 *
 * These values are for *display only* (document "Stand:" footers, copyright
 * year). They are NOT time-entry timestamps and have nothing to do with the
 * ArbZG/revisionssicherheit guarantees, which live in `timestamps.ts`.
 */

export const currentYear = new Date().getFullYear();

/** Today's date, formatted for German "Stand:" footers (e.g. 18.6.2026). */
export const legalStandDate = new Date().toLocaleDateString("de-DE");

/** ISO 8601 build/stand date, e.g. 2026-06-18. */
export const legalStandIso = new Date().toISOString().slice(0, 10);
