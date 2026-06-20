/**
 * PresencePanel — right-side slide-in attendance list (Discord-style member
 * panel). Docked below the app header on desktop; full overlay drawer on
 * mobile. Toggle is controlled by the parent (AppShell).
 *
 * Fetches its own presence data and reuses PresenceRow. Presence-only — no
 * compliance warnings are shown for colleagues.
 */

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import {
  PresenceRow,
  type PresenceMember,
} from "@/components/presence-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

interface PresenceData {
  meId: string;
  members: PresenceMember[];
}

interface PresencePanelProps {
  open: boolean;
  onClose: () => void;
}

export function PresencePanel({ open, onClose }: PresencePanelProps) {
  const { data, isLoading } = useQuery<PresenceData>({
    queryKey: ["presence"],
    queryFn: async () => {
      const res = await fetch("/api/v1/presence");
      const json: ApiResponse<PresenceData> = await res.json();
      return json.data!;
    },
    // Only poll while open — no need to fetch when hidden
    refetchInterval: open ? 30_000 : false,
    enabled: open,
  });

  // Working colleagues first (running → paused → off), then stable by name.
  const sorted = useMemo(() => {
    const order: Record<PresenceMember["status"], number> = {
      running: 0,
      paused: 1,
      off: 2,
    };
    return [...(data?.members ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status];
      if (byStatus !== 0) return byStatus;
      return `${a.lastName}${a.firstName}`.localeCompare(
        `${b.lastName}${b.firstName}`,
      );
    });
  }, [data?.members]);

  const present = data?.members.filter((m) => m.status !== "off").length ?? 0;
  const total = data?.members.length ?? 0;

  return (
    <>
      {/* Mobile backdrop — tap to close. Hidden on desktop (docked panel). */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          aria-hidden="true"
          onClick={onClose}
          data-testid="presence-backdrop"
        />
      )}

      <div
        data-testid="presence-panel"
        role="complementary"
        aria-label="Anwesenheit"
        className={`fixed top-14 bottom-0 right-0 z-40 w-[340px] max-w-[86vw] bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Anwesenheit
            </p>
            <p className="text-xs text-muted-foreground">
              {data ? `${present} von ${total} anwesend` : "Lädt…"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Anwesenheit schließen"
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Scrollable member list — only populated while open so closed-panel
            content never collides with page text queries (strict mode). */}
        <div className="flex-1 overflow-y-auto">
          {!open ? null : isLoading || !data ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 px-4">
              Keine Mitarbeiter gefunden.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {sorted.map((m) => (
                <PresenceRow key={m.employeeId} m={m} isMe={m.employeeId === data.meId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
