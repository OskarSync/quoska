/**
 * Sick Entry List — Shows sick entries with AU status and edit capability.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import type { ApiResponse } from "@/types/api";
import { SickEntryEditDialog } from "@/components/sick-entry-edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Pencil } from "lucide-react";

interface SickEntry {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string | null;
  work_days_count: number | null;
  au_certificate_url: string | null;
  au_uploaded_at: string | null;
  notes: string | null;
}

export function SickEntryList() {
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery<SickEntry[]>({
    queryKey: ["sickEntries"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sick-entries");
      const json: ApiResponse<SickEntry[]> = await res.json();
      return json.data ?? [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/v1/sick-entries/${id}/au`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sickEntries"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  if (!entries || entries.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Keine Krankmeldungen vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isOngoing = !entry.end_date;
        const hasAu = !!entry.au_certificate_url;
        const needsAu =
          !hasAu &&
          !isOngoing &&
          entry.work_days_count !== null &&
          entry.work_days_count >= 3;

        return (
          <SickEntryCard
            key={entry.id}
            entry={entry}
            hasAu={hasAu}
            needsAu={needsAu}
            isOngoing={isOngoing}
            onUpload={(file) =>
              uploadMutation.mutate({ id: entry.id, file })
            }
            isUploading={uploadMutation.isPending}
          />
        );
      })}
    </div>
  );
}

function SickEntryCard({
  entry,
  hasAu,
  needsAu,
  isOngoing,
  onUpload,
  isUploading,
}: {
  entry: SickEntry;
  hasAu: boolean;
  needsAu: boolean;
  isOngoing: boolean;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card className="rounded-xl">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">Krankmeldung</span>
                {isOngoing && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Fortlaufend
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {fmtDate(entry.start_date)}
                {entry.end_date
                  ? ` – ${fmtDate(entry.end_date)}`
                  : " – heute"}
                {entry.work_days_count !== null &&
                  ` · ${entry.work_days_count} Arbeitstage`}
              </p>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {entry.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasAu ? (
                <Badge
                  variant="default"
                  className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700"
                >
                  ✅ AU vorhanden
                </Badge>
              ) : needsAu ? (
                <>
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0"
                  >
                    ⚠️ AU fehlt
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 px-2"
                    onClick={() => fileRef.current?.click()}
                    disabled={isUploading}
                    title="AU hochladen"
                  >
                    <Upload className="size-4" />
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(file);
                    }}
                  />
                </>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                className="size-8 px-2"
                onClick={() => setEditOpen(true)}
                title="Bearbeiten"
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* key forces remount so useState gets fresh values per entry */}
      <SickEntryEditDialog
        key={entry.id}
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
