# Pattern: Feiertage (Public Holiday Handling)

**owner:** oskar  
**last_verified:** 2026-05-12  

---

## Legal Context

German public holidays (Feiertage) are determined at the **Bundesland** (federal state) level. There are 9 nationwide holidays + 3-6 state-specific holidays. This affects:

- Whether an employee was expected to work on a given day
- Overtime calculations (Feiertagszuschlag)
- Soll-Stunden (target hours) calculation

## Data Model

### Bundesland Enum

```typescript
type Bundesland =
  | 'baden-wuerttemberg'
  | 'bayern'
  | 'berlin'
  | 'brandenburg'
  | 'bremen'
  | 'hamburg'
  | 'hessen'
  | 'mecklenburg-vorpommern'
  | 'niedersachsen'
  | 'nordrhein-westfalen'
  | 'rheinland-pfalz'
  | 'saarland'
  | 'sachsen'
  | 'sachsen-anhalt'
  | 'schleswig-holstein'
  | 'thueringen';
```

### Holiday Table

```sql
CREATE TABLE public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name TEXT NOT NULL,           -- e.g., "Tag der Deutschen Einheit"
  bundesland TEXT NOT NULL,     -- 'all' for nationwide, or specific Bundesland
  source TEXT NOT NULL          -- e.g., "Feiertagsgesetz BW"
);

CREATE INDEX idx_holidays_date_bundesland ON public_holidays(date, bundesland);
```

### Employee Configuration

```typescript
interface Employee {
  // ...
  bundesland: Bundesland;  // Determines which holidays apply
  target_hours_week: number;  // e.g., 40
}
```

## Holiday Logic

```typescript
function isPublicHoliday(date: Date, bundesland: Bundesland): boolean {
  const holidays = getHolidaysForDate(date);
  return holidays.some(h => h.bundesland === 'all' || h.bundesland === bundesland);
}

function getWorkingDaysInWeek(weekStart: Date, bundesland: Bundesland): number {
  let workingDays = 0;
  for (let i = 0; i < 5; i++) {  // Mon-Fri
    const day = addDays(weekStart, i);
    if (!isPublicHoliday(day, bundesland)) {
      workingDays++;
    }
  }
  return workingDays;
}

function getTargetHoursForWeek(weekStart: Date, bundesland: Bundesland, weeklyTarget: number): number {
  const workingDays = getWorkingDaysInWeek(weekStart, bundesland);
  const dailyTarget = weeklyTarget / 5;  // Standard: 8h/day for 40h/week
  return workingDays * dailyTarget;
}
```

## Holiday Data Source

Use a pre-computed table (not API calls at runtime):

1. **Seed script** generates holidays for current year + next year per Bundesland
2. **Annual cron job** adds holidays for the upcoming year
3. **Source:** Official Feiertagsgesetz per Bundesland

### Fixed Holidays (Nationwide)

| Date | Name |
|------|------|
| Jan 1 | Neujahr |
| May 1 | Tag der Arbeit |
| Oct 3 | Tag der Deutschen Einheit |
| Dec 25 | 1. Weihnachtsfeiertag |
| Dec 26 | 2. Weihnachtsfeiertag |

### Variable Holidays (Nationwide, based on Easter)

| Holiday | Calculation |
|---------|-------------|
| Karfreitag | Easter - 2 days |
| Ostermontag | Easter + 1 day |
| Christi Himmelfahrt | Easter + 39 days |
| Pfingstmontag | Easter + 50 days |

### State-Specific Examples

| Holiday | Bundesländer |
|---------|-------------|
| Heilige Drei Könige (Jan 6) | BW, BY, ST |
| Fronleichnam | BW, BY, HE, NW, RP, SL |
| Mariä Himmelfahrt (Aug 15) | SL, BY (kath. Gemeinden) |
| Weltkindertag (Sep 20) | TH (since 2019) |
| Reformationstag (Oct 31) | BB, MV, SN, ST, TH (+ all in 2017 only) |
| Allerheiligen (Nov 1) | BW, BY, NW, RP, SL |
| Buß- und Bettag | SN |

## Easter Calculation

```typescript
// Gauss algorithm for Easter Sunday
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}
```

## Testing

```typescript
describe('Feiertage', () => {
  test('Tag der Deutschen Einheit is holiday everywhere', () => {
    for (const bl of ALL_BUNDESLAENDER) {
      expect(isPublicHoliday(new Date('2026-10-03'), bl)).toBe(true);
    }
  });

  test('Heilige Drei Könige is holiday in BW, BY, ST only', () => {
    expect(isPublicHoliday(new Date('2026-01-06'), 'baden-wuerttemberg')).toBe(true);
    expect(isPublicHoliday(new Date('2026-01-06'), 'bayern')).toBe(true);
    expect(isPublicHoliday(new Date('2026-01-06'), 'sachsen-anhalt')).toBe(true);
    expect(isPublicHoliday(new Date('2026-01-06'), 'berlin')).toBe(false);
  });

  test('target hours reduced in weeks with holidays', () => {
    // Week containing Oct 3 (Tag der Deutschen Einheit) = Thu
    const weekStart = new Date('2026-09-28'); // Monday
    const target = getTargetHoursForWeek(weekStart, 'berlin', 40);
    expect(target).toBe(32);  // 4 working days * 8h
  });

  test('Easter calculation is correct for 2026', () => {
    expect(easterSunday(2026)).toEqual(new Date('2026-04-05'));
  });
});
```
