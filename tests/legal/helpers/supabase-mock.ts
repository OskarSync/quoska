/**
 * Shared Supabase mock helpers for legal compliance tests.
 *
 * Uses a Proxy-based mock that supports arbitrary method chains.
 * All chains are thenable so `await chain` works without terminal methods.
 */

import { vi } from "vitest";

export type Resolver = () => Promise<{ data: unknown; error?: unknown }>;

export function createChain(resolver: Resolver): Record<string, unknown> {
  const terminalMethods = new Set(["maybeSingle", "single"]);
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) => {
          resolver().then(resolve, reject);
        };
      }
      if (terminalMethods.has(prop)) return vi.fn(resolver);
      return vi.fn().mockReturnValue(proxy);
    },
  };
  const proxy = new Proxy({} as Record<string, unknown>, handler);
  return proxy;
}

export function createTableMock(config: {
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

export function createMockSupabase(tables: Record<string, Partial<ReturnType<typeof createTableMock>>>) {
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
