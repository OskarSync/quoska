/**
 * CorrectionReviewList — Manager view of pending correction requests.
 *
 * Shows pending requests with approve/reject actions.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { CorrectionRequest } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

/** Format ISO date to DD.MM.YYYY for display. */
function formatDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-");
  return `${d}.${m}.${y}`;
}

export function CorrectionReviewList() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["corrections", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/v1/corrections");
      const json: ApiResponse<CorrectionRequest[]> = await res.json();
      return json.data ?? [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reviewNote,
    }: {
      id: string;
      action: "approve" | "reject";
      reviewNote?: string;
    }) => {
      const res = await fetch(`/api/v1/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, review_note: reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corrections"] });
      setExpandedId(null);
      setRejectNote("");
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Card><CardContent><div className="h-16" /></CardContent></Card></div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Keine offenen Korrekturanfragen.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {requests.map((req) => (
        <Card key={req.id}>
          <CardContent>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Eintrag vom{" "}
                  {formatDate(req.created_at)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  &quot;{req.reason}&quot;
                </p>

                {expandedId === req.id ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Ablehnungsgrund (optional)"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => {
                          reviewMutation.mutate({
                            id: req.id,
                            action: "approve",
                          });
                        }}
                        disabled={reviewMutation.isPending}
                      >
                        Genehmigen
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          reviewMutation.mutate({
                            id: req.id,
                            action: "reject",
                            reviewNote: rejectNote || undefined,
                          });
                        }}
                        disabled={reviewMutation.isPending}
                      >
                        Ablehnen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExpandedId(null);
                          setRejectNote("");
                        }}
                      >
                        Zurück
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setExpandedId(req.id)}
                  >
                    Prüfen →
                  </Button>
                )}
              </div>

              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0">
                Offen
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
