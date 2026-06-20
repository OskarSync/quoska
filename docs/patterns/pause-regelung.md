# Pattern: Pausenregelung (Break Time Enforcement)

**owner:** oskar  
**last_verified:** 2026-05-12  

---

## Legal Basis

**§4 ArbZG:**
- After **6 hours** of continuous work: minimum **30 minutes** break
- After **9 hours** of continuous work: minimum **45 minutes** break total
- Breaks can be split into blocks of **at least 15 minutes** each
- Breaks must be granted **in advance** (vor Beginn der Ruhezeit)

## Implementation

### Data Model

```typescript
// Time entry tracks break time
interface TimeEntry {
  id: UUID;
  clock_in: Timestamp;       // server-generated
  clock_out: Timestamp | null;
  break_minutes: number;     // accumulated break time in minutes
  status: 'running' | 'paused' | 'completed';
}

// Break sessions are tracked separately for audit
interface BreakSession {
  id: UUID;
  time_entry_id: UUID;
  break_start: Timestamp;    // server-generated
  break_end: Timestamp | null;
  duration_minutes: number | null;
}
```

### Break Calculation

```typescript
function calculateRequiredBreak(workMinutes: number): number {
  if (workMinutes >= 540) return 45;  // 9+ hours → 45min
  if (workMinutes >= 360) return 30;  // 6+ hours → 30min
  return 0;                            // < 6 hours → no break required
}

function calculateWorkMinutes(clockIn: Timestamp, clockOut: Timestamp | null, breakMinutes: number): number {
  const end = clockOut ?? serverNow();
  return differenceInMinutes(end, clockIn) - breakMinutes;
}
```

### Warning Logic

```typescript
function getBreakWarnings(entry: TimeEntry): BreakWarning[] {
  const warnings: BreakWarning[] = [];
  if (entry.status !== 'running') return warnings;

  const workMinutes = calculateWorkMinutes(entry.clock_in, null, entry.break_minutes);

  // Warning at 5h45m: "Break coming up in 15 minutes"
  if (workMinutes >= 345 && workMinutes < 360 && entry.break_minutes < 30) {
    warnings.push({
      level: 'info',
      message: 'In 15 Minuten ist eine Pause von mindestens 30 Minuten fällig (§4 ArbZG).',
    });
  }

  // Warning at 6h without break: "Break is now required"
  if (workMinutes >= 360 && entry.break_minutes < 30) {
    warnings.push({
      level: 'warning',
      message: 'Seit 6 Stunden gearbeitet. Es ist gesetzlich eine Pause von mindestens 30 Minuten erforderlich (§4 ArbZG).',
    });
  }

  // Hard warning at 6h30m without break
  if (workMinutes >= 390 && entry.break_minutes < 30) {
    warnings.push({
      level: 'critical',
      message: 'Seit über 6,5 Stunden ohne Pause gearbeitet. Bitte sofort eine Pause einlegen! (§4 ArbZG)',
    });
  }

  return warnings;
}
```

### Minimum Break Block Size

```typescript
function endBreak(breakSessionId: UUID): void {
  const duration = calculateBreakDuration(breakSessionId);

  if (duration < 15) {
    throw new ValidationError(
      'Pause muss mindestens 15 Minuten dauern (§4 ArbZG). ' +
      `Aktuell: ${duration} Minuten.`
    );
  }
}
```

## Testing

```typescript
// tests/legal/arbzg.test.ts

describe('Pausenregelung §4 ArbZG', () => {
  test('no break required for <6h work', () => {
    expect(calculateRequiredBreak(300)).toBe(0);
  });

  test('30min break required after 6h', () => {
    expect(calculateRequiredBreak(360)).toBe(30);
  });

  test('45min break required after 9h', () => {
    expect(calculateRequiredBreak(540)).toBe(45);
  });

  test('warning triggers at 6h without break', () => {
    const entry = createMockEntry({ workMinutes: 360, breakMinutes: 0 });
    const warnings = getBreakWarnings(entry);
    expect(warnings).toContainEqual(
      expect.objectContaining({ level: 'warning' })
    );
  });

  test('break block <15min is rejected', () => {
    expect(() => endBreak(shortBreakSession)).toThrow('mindestens 15 Minuten');
  });
});
```
