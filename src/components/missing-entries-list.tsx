/**
 * Missing Entries List — Shows workdays where employees have no time entries.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface MissingEntry {
  employeeId: string;
  employeeName: string;
  date: string;
}

interface MissingEntriesListProps {
  entries: MissingEntry[];
}

/** Format ISO date to DD.MM. */
function formatDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}`;
}

export function MissingEntriesList({ entries }: MissingEntriesListProps) {
  if (entries.length === 0) return null;

  return (
    <Card className="shadow-sm rounded-xl">
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center size-7 rounded-lg bg-amber-50 text-amber-600">
            <ClipboardList className="size-4" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fehlende Einträge ({entries.length})
          </h3>
        </div>
        <div className="space-y-1 ml-9">
          {entries.slice(0, 10).map((entry, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {entry.employeeName} — {formatDate(entry.date)}
            </p>
          ))}
          {entries.length > 10 && (
            <p className="text-xs text-muted-foreground">
              und {entries.length - 10} weitere…
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
