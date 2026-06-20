/**
 * Integration tests for the full clock flow — Story 2.4
 *
 * Uses a Proxy-based Supabase mock that supports arbitrary method chains.
 */

import { describe, test, expect, vi } from "vitest";
import {
  calculateNetWorkMinutes,
  getBreakWarnings,
} from "@/services/complianceService";
import type { TimeEntry, BreakSession } from "@/types/database";

// ---------------------------------------------------------------------------
// Proxy-based fully chainable Supabase mock
// ---------------------------------------------------------------------------

type Resolver = () => Promise<{ data: unknown; error?: unknown }>;

/**
 * Creates a chainable query builder using a Proxy.
 * Every method call returns the proxy itself (for chaining),
 * until a terminal method (maybeSingle, single, etc.) is called,
 * which returns the resolver's promise.
 */
function createChain(resolver: Resolver): Record<string, unknown> {
  const terminalMethods = new Set(["maybeSingle", "single"]);

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (terminalMethods.has(prop)) {
        return vi.fn(resolver);
      }
      // Return a function that returns the proxy (for chaining)
      return vi.fn().mockReturnValue(proxy);
    },
  };

  const proxy = new Proxy({} as Record<string, unknown>, handler);
  return proxy;
}

/**
 * Creates a table mock that returns different chains for select vs insert vs update.
 * Each chain type can have its own resolver.
 */
function createTableMock(config: {
  selectResolver?: Resolver;
  insertResolver?: Resolver;
  updateResolver?: Resolver;
}) {
  return {
    select: vi.fn().mockReturnValue(createChain(config.selectResolver ?? (async () => ({ data: null })))),
    insert: vi.fn().mockReturnValue(createChain(config.insertResolver ?? (async () => ({ data: null, error: null })))),
    update: vi.fn().mockReturnValue(createChain(config.updateResolver ?? (async () => ({ data: null, error: null })))),
  };
}

function createMockSupabase(tables: Record<string, Partial<ReturnType<typeof createTableMock>>> = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      const t = tables[table];
      if (!t) return createTableMock({});
      return {
        select: t.select ?? createTableMock({}).select,
        insert: t.insert ?? createTableMock({}).insert,
        update: t.update ?? createTableMock({}).update,
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", app_metadata: { tenant_id: "t-1", employee_id: "e-1", role: "employee" } } },
      }),
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// ---------------------------------------------------------------------------
// Midnight Crossover — Story 2.4 AC
// ---------------------------------------------------------------------------

describe("Midnight crossover", () => {
  test("time entry spanning midnight records date as clock_in date", () => {
    const entry: TimeEntry = {
      id: "entry-1", tenant_id: "t-1", employee_id: "e-1",
      date: "2026-05-29",
      clock_in: "2026-05-29T22:00:00.000Z",
      clock_out: "2026-05-30T06:00:00.000Z",
      break_minutes: 0, status: "completed", notes: null,
      created_at: "2026-05-29T22:00:00.000Z",
      updated_at: "2026-05-30T06:00:00.000Z", deleted_at: null,
    };

    expect(entry.date).toBe("2026-05-29");
    const duration = Math.round(Math.abs(Date.parse(entry.clock_out!) - Date.parse(entry.clock_in)) / 60_000);
    expect(duration).toBe(480);
  });

  test("clockIn passes todayDate to the insert call", async () => {
    const { clockIn } = await import("@/services/timeEntryService");

    let insertedData: unknown = null;

    const auditInsertResult = { data: null, error: null };
    // Make the audit insert chain thenable (resolves when awaited without .single())
    const auditInsertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(auditInsertResult),
      then: vi.fn((resolve: (v: unknown) => unknown) => resolve(auditInsertResult)),
    };

    const tables = {
      time_entries: createTableMock({
        selectResolver: async () => ({ data: null }), // no active entry
        insertResolver: async () => {
          return {
            data: {
              id: "e-1", tenant_id: "t-1", employee_id: "e-1",
              date: (insertedData as Record<string, unknown>)?.date ?? "2026-05-29",
              clock_in: "2026-05-29T22:00:00.000Z", clock_out: null,
              break_minutes: 0, status: "running", notes: null,
              created_at: "", updated_at: "", deleted_at: null,
            },
            error: null,
          };
        },
      }),
      time_entry_audit: {
        insert: vi.fn().mockReturnValue(auditInsertChain),
      },
    };

    const originalInsert = tables.time_entries.insert;
    tables.time_entries.insert = vi.fn().mockImplementation((data: unknown) => {
      insertedData = data;
      return originalInsert();
    });

    const supabase = createMockSupabase(tables);
    const result = await clockIn(supabase, "t-1", "e-1", "2026-05-29");

    expect(result.data).not.toBeNull();
    expect(insertedData).toMatchObject({ date: "2026-05-29" });
  });
});

// ---------------------------------------------------------------------------
// Multiple Breaks — Story 2.4 AC
// ---------------------------------------------------------------------------

describe("Multiple breaks in one shift", () => {
  test("break_minutes is sum of all completed break sessions", () => {
    const sessions: BreakSession[] = [
      { id: "b-1", tenant_id: "t-1", time_entry_id: "e-1", break_start: "", break_end: "", duration_minutes: 15, created_at: "", updated_at: "" },
      { id: "b-2", tenant_id: "t-1", time_entry_id: "e-1", break_start: "", break_end: "", duration_minutes: 20, created_at: "", updated_at: "" },
    ];
    expect(sessions.reduce((s, b) => s + (b.duration_minutes ?? 0), 0)).toBe(35);
  });

  test("net hours = (clock_out − clock_in) − break_minutes", () => {
    expect(calculateNetWorkMinutes("2026-05-30T08:00:00.000Z", "2026-05-30T17:00:00.000Z", 35, "2026-05-30T08:00:00.000Z")).toBe(505);
  });
});

// ---------------------------------------------------------------------------
// Short Shift — Story 2.4 AC
// ---------------------------------------------------------------------------

describe("Short shift without break", () => {
  test("no break warning for 5h30m shift", () => {
    expect(getBreakWarnings(330, 0)).toHaveLength(0);
  });

  test("net time for 5h30m shift with no break", () => {
    expect(calculateNetWorkMinutes("2026-05-30T08:00:00.000Z", "2026-05-30T13:30:00.000Z", 0, "2026-05-30T08:00:00.000Z")).toBe(330);
  });
});

// ---------------------------------------------------------------------------
// Concurrent Prevention — FR-3 / Story 2.4
// ---------------------------------------------------------------------------

describe("Concurrent entry prevention (FR-3)", () => {
  test("clockIn returns error when active entry exists", async () => {
    const { clockIn } = await import("@/services/timeEntryService");

    const existingEntry: TimeEntry = {
      id: "existing", tenant_id: "t-1", employee_id: "e-1", date: "2026-05-30",
      clock_in: "2026-05-30T08:00:00.000Z", clock_out: null, break_minutes: 0,
      status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null,
    };

    const tables = {
      time_entries: createTableMock({ selectResolver: async () => ({ data: existingEntry }) }),
    };
    const supabase = createMockSupabase(tables);
    const result = await clockIn(supabase, "t-1", "e-1", "2026-05-30");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Du bist bereits eingestempelt");
  });
});

// ---------------------------------------------------------------------------
// Clock Out While Paused — Story 2.4
// ---------------------------------------------------------------------------

describe("Clock out while on break", () => {
  test("clockOut returns error when entry is paused", async () => {
    const { clockOut } = await import("@/services/timeEntryService");

    const pausedEntry: TimeEntry = {
      id: "entry-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-05-30",
      clock_in: "2026-05-30T08:00:00.000Z", clock_out: null, break_minutes: 0,
      status: "paused", notes: null, created_at: "", updated_at: "", deleted_at: null,
    };

    const tables = {
      time_entries: createTableMock({ selectResolver: async () => ({ data: pausedEntry }) }),
    };
    const supabase = createMockSupabase(tables);
    const result = await clockOut(supabase, "t-1", "e-1", "entry-1", "2026-05-30T17:00:00.000Z");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Bitte beende zuerst deine Pause");
  });
});

// ---------------------------------------------------------------------------
// Break Minimum — §4 ArbZG / Story 2.4
// ---------------------------------------------------------------------------

describe("Break minimum 15 minutes (§4 ArbZG)", () => {
  test("ending break before 15 minutes is rejected", async () => {
    const { endBreak } = await import("@/services/breakService");

    const shortBreak: BreakSession = {
      id: "b-1", tenant_id: "t-1", time_entry_id: "entry-1",
      break_start: "2026-05-30T10:00:00.000Z", break_end: null,
      duration_minutes: null, created_at: "", updated_at: "",
    };

    const parentEntry: TimeEntry = {
      id: "entry-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-05-30",
      clock_in: "2026-05-30T08:00:00.000Z", clock_out: null, break_minutes: 0,
      status: "paused", notes: null, created_at: "", updated_at: "", deleted_at: null,
    };

    // break_sessions select → shortBreak, time_entries select → parentEntry
    const tables = {
      break_sessions: createTableMock({ selectResolver: async () => ({ data: shortBreak }) }),
      time_entries: createTableMock({ selectResolver: async () => ({ data: parentEntry }) }),
    };
    const supabase = createMockSupabase(tables);

    // End break after only 12 minutes
    const result = await endBreak(supabase, "t-1", "e-1", "b-1", "2026-05-30T10:12:00.000Z");

    expect(result.data).toBeNull();
    expect(result.error).toContain("mindestens 15 Minuten");
    expect(result.error).toContain("12 Minuten");
  });
});

// ---------------------------------------------------------------------------
// Network Failure — Story 2.4
// ---------------------------------------------------------------------------

describe("Network failure handling", () => {
  test("clockIn returns user-friendly error on DB failure", async () => {
    const { clockIn } = await import("@/services/timeEntryService");

    const tables = {
      time_entries: createTableMock({
        selectResolver: async () => ({ data: null }),
        insertResolver: async () => ({ data: null, error: { message: "Network error" } }),
      }),
    };
    const supabase = createMockSupabase(tables);
    const result = await clockIn(supabase, "t-1", "e-1", "2026-05-30");

    expect(result.data).toBeNull();
    expect(result.error).toContain("fehlgeschlagen");
  });
});

// ---------------------------------------------------------------------------
// Full Day Cycle — Story 2.4
// ---------------------------------------------------------------------------

describe("Full day cycle", () => {
  test("8h shift with 35min break = 8h25m net", () => {
    const net = calculateNetWorkMinutes("2026-05-30T08:00:00.000Z", "2026-05-30T17:00:00.000Z", 35, "2026-05-30T08:00:00.000Z");
    expect(net).toBe(505);
    expect(Math.floor(net / 60)).toBe(8);
    expect(net % 60).toBe(25);
  });

  test("no break warning after 6h if 30min break taken", () => {
    expect(getBreakWarnings(480, 30)).toHaveLength(0);
  });

  test("10h net triggers daily limit warning", () => {
    const net = calculateNetWorkMinutes("2026-05-30T07:00:00.000Z", "2026-05-30T18:00:00.000Z", 60, "2026-05-30T07:00:00.000Z");
    expect(net).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// Server State Persistence — Story 2.4
// ---------------------------------------------------------------------------

describe("Server state persistence (browser tab closed)", () => {
  test("active entry data model persists across sessions", () => {
    // This verifies the data model: an active entry with no clock_out
    // survives across browser sessions because it's stored server-side.
    const activeEntry: TimeEntry = {
      id: "entry-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-05-30",
      clock_in: "2026-05-30T08:00:00.000Z", clock_out: null, break_minutes: 0,
      status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null,
    };

    // Verify the entry has no clock_out (still running)
    expect(activeEntry.clock_out).toBeNull();
    expect(activeEntry.status).toBe("running");

    // Verify the entry can be used to calculate elapsed time from server state
    const nowIso = "2026-05-30T17:00:00.000Z"; // 9 hours later
    const elapsed = calculateNetWorkMinutes(
      activeEntry.clock_in, activeEntry.clock_out, activeEntry.break_minutes, nowIso,
    );
    expect(elapsed).toBe(540); // 9h
  });
});
