/**
 * AppHeader — persistent top bar shown across all /app/* pages.
 *
 * Left: the current tab name (derived from the route).
 * Right: the user's own clock in/out widget (hidden on /app/clock, which has
 *        its own full stamp button) and an "Anwesenheit" toggle that opens the
 *        right-side presence panel.
 */

"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { PresenceMember } from "@/components/presence-row";
import { HeaderClockWidget } from "@/components/header-clock-widget";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";

/** Route prefix → human label, ordered most-specific first. */
const ROUTE_LABELS: { match: string; label: string }[] = [
  { match: "/app/dashboard", label: "Dashboard" },
  { match: "/app/clock", label: "Stempeln" },
  { match: "/app/my-times", label: "Meine Zeiten" },
  { match: "/app/notifications", label: "Benachrichtigungen" },
  { match: "/app/vacation", label: "Urlaub" },
  { match: "/app/sick", label: "Krankmeldung" },
  { match: "/app/employees", label: "Mitarbeiter" },
  { match: "/app/projects", label: "Projekte" },
  { match: "/app/reports", label: "Berichte" },
  { match: "/app/settings", label: "Einstellungen" },
];

function useRouteLabel(pathname: string): string {
  for (const r of ROUTE_LABELS) {
    if (pathname.startsWith(r.match)) return r.label;
  }
  return "Quoska";
}

export function AppHeader({
  presenceOpen,
  onTogglePresence,
}: {
  presenceOpen: boolean;
  onTogglePresence: () => void;
}) {
  const pathname = usePathname();
  const label = useRouteLabel(pathname);

  // The dedicated Stempeln page already has the full stamp button; don't
  // duplicate a "Stempeln" button there (would also break page locators).
  const showClockWidget = !pathname.startsWith("/app/clock");

  // Light presence query for the toggle badge count (React Query dedupes with
  // the panel's query when the panel is open).
  const { data } = useQuery<{ members: PresenceMember[] }>({
    queryKey: ["presence"],
    queryFn: async () => {
      const res = await fetch("/api/v1/presence");
      const json: ApiResponse<{ meId: string; members: PresenceMember[] }> =
        await res.json();
      return json.data!;
    },
    refetchInterval: 30_000,
  });
  const presentCount =
    data?.members.filter((m) => m.status !== "off").length ?? null;

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200"
    >
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 gap-3">
        {/* Left: current tab name (contextual label, not a heading — each page
            has its own <h1> as the primary document heading). */}
        <p
          className="text-base font-semibold text-gray-900 truncate max-w-[45vw] sm:max-w-xs"
          title={label}
          data-testid="app-header-tab"
        >
          {label}
        </p>

        {/* Right: clock widget + presence toggle */}
        <div className="flex items-center gap-2">
          {showClockWidget && <HeaderClockWidget />}

          <Button
            variant={presenceOpen ? "default" : "outline"}
            size="sm"
            onClick={onTogglePresence}
            aria-label="Anwesenheit"
            aria-expanded={presenceOpen}
            aria-pressed={presenceOpen}
            className="gap-1.5"
          >
            <UserCheck className="size-4" />
            <span className="hidden sm:inline">Anwesenheit</span>
            {presentCount !== null && (
              <span
                className={`ml-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold ${
                  presenceOpen
                    ? "bg-white/20 text-white"
                    : "bg-violet-100 text-violet-700"
                }`}
                data-testid="presence-count"
              >
                {presentCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
