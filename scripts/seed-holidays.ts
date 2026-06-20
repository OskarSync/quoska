/**
 * Seed script for German public holidays.
 *
 * Populates the public_holidays table for the current year + next year,
 * all 16 Bundesländer + nationwide holidays.
 *
 * Uses the Gauss algorithm for Easter calculation.
 * Reference: docs/patterns/feiertage.md
 *
 * Usage: npx tsx scripts/seed-holidays.ts
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUNDESLAENDER = [
  "baden-wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen",
  "sachsen-anhalt",
  "schleswig-holstein",
  "thueringen",
] as const;

type Bundesland = (typeof BUNDESLAENDER)[number];

// ─── Easter Calculation (Gauss Algorithm) ───────────────────────────

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Holiday Definitions ────────────────────────────────────────────

interface HolidayDef {
  name: string;
  getDate: (year: number) => Date;
  bundesland: Bundesland[] | "all";
}

const HOLIDAYS: HolidayDef[] = [
  // ── Nationwide (fixed) ──
  { name: "Neujahr", getDate: (y) => new Date(y, 0, 1), bundesland: "all" },
  { name: "Tag der Arbeit", getDate: (y) => new Date(y, 4, 1), bundesland: "all" },
  { name: "Tag der Deutschen Einheit", getDate: (y) => new Date(y, 9, 3), bundesland: "all" },
  { name: "1. Weihnachtsfeiertag", getDate: (y) => new Date(y, 11, 25), bundesland: "all" },
  { name: "2. Weihnachtsfeiertag", getDate: (y) => new Date(y, 11, 26), bundesland: "all" },

  // ── Nationwide (variable, Easter-based) ──
  { name: "Karfreitag", getDate: (y) => addDays(easterSunday(y), -2), bundesland: "all" },
  { name: "Ostermontag", getDate: (y) => addDays(easterSunday(y), 1), bundesland: "all" },
  { name: "Christi Himmelfahrt", getDate: (y) => addDays(easterSunday(y), 39), bundesland: "all" },
  { name: "Pfingstmontag", getDate: (y) => addDays(easterSunday(y), 50), bundesland: "all" },

  // ── State-specific (fixed) ──
  { name: "Heilige Drei Könige", getDate: (y) => new Date(y, 0, 6), bundesland: ["baden-wuerttemberg", "bayern", "sachsen-anhalt"] },
  { name: "Weltkindertag", getDate: (y) => new Date(y, 8, 20), bundesland: ["thueringen"] },
  { name: "Reformationstag", getDate: (y) => new Date(y, 9, 31), bundesland: ["brandenburg", "mecklenburg-vorpommern", "sachsen", "sachsen-anhalt", "thueringen"] },
  { name: "Allerheiligen", getDate: (y) => new Date(y, 10, 1), bundesland: ["baden-wuerttemberg", "bayern", "nordrhein-westfalen", "rheinland-pfalz", "saarland"] },

  // ── State-specific (variable, Easter-based) ──
  { name: "Fronleichnam", getDate: (y) => addDays(easterSunday(y), 60), bundesland: ["baden-wuerttemberg", "bayern", "hessen", "nordrhein-westfalen", "rheinland-pfalz", "saarland"] },

  // ── Bayern-specific: Mariä Himmelfahrt (only in Catholic municipalities) ──
  // We include it for bayern as a whole (simplification)
  { name: "Mariä Himmelfahrt", getDate: (y) => new Date(y, 7, 15), bundesland: ["saarland", "bayern"] },

  // ── Sachsen-specific: Buß- und Bettag ──
  // Wednesday before the last Sunday of the church year
  // Formula: 11 Nov + (Wednesday offset from Sunday)
  {
    name: "Buß- und Bettag",
    getDate: (y) => {
      // The Buß- und Bettag is the Wednesday before Totensonner (last Sunday before Advent)
      // Totensonner = Sunday before first Advent = Dec 25 - (weekday offset) - 28 days
      // Simplified: find the Wednesday between Nov 16 and Nov 22
      const nov22 = new Date(y, 10, 22);
      const dayOfWeek = nov22.getDay();
      // Days since Wednesday
      const diff = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
      return new Date(y, 10, 22 - diff);
    },
    bundesland: ["sachsen"],
  },
];

// ─── Seed Function ──────────────────────────────────────────────────

async function seed() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  const rows: { date: string; name: string; bundesland: string }[] = [];

  for (const year of years) {
    for (const holiday of HOLIDAYS) {
      const date = holiday.getDate(year);

      if (holiday.bundesland === "all") {
        rows.push({
          date: formatDate(date),
          name: holiday.name,
          bundesland: "all",
        });
      } else {
        for (const bl of holiday.bundesland) {
          rows.push({
            date: formatDate(date),
            name: holiday.name,
            bundesland: bl,
          });
        }
      }
    }
  }

  console.log(`Seeding ${rows.length} holiday records for ${years.join(", ")}...`);

  // Insert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from("public_holidays").insert(batch);

    if (error) {
      console.error("Error inserting holidays:", error);
      process.exit(1);
    }
  }

  console.log("✅ Holidays seeded successfully!");

  // Verify Easter calculation
  const easter2026 = easterSunday(2026);
  console.log(`Easter 2026: ${formatDate(easter2026)} (expected: 2026-04-05)`);
}

seed().catch(console.error);
