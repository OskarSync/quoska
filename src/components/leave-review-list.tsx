/**
 * Leave Review List — Manager view of pending leave requests with approve/reject.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

interface LeaveRequest {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  work_days_count: number;
  reason: string | null;
  status: string;
}

interface LeaveReviewListProps {
  requests?: LeaveRequest[];
  isLoading?: boolean;
}

export function LeaveReviewList({ requests, isLoading }: LeaveReviewListProps) {
  const queryClient = useQueryClient();

  // Fetch if no data passed in
  const { data: fetchedRequests, isLoading: fetching } = useQuery<LeaveRequest[]>({
    queryKey: ["pendingLeaveRequests"],
    queryFn: async () => {
      const res = await fetch("/api/v1/leave-requests?status=pending");
      const json: ApiResponse<LeaveRequest[]> = await res.json();
      return json.data ?? [];
    },
    enabled: !requests,
  });

  const items = requests ?? fetchedRequests ?? [];
  const loading = isLoading ?? fetching;

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) => {
      const res = await fetch(`/api/v1/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, review_note: note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLeaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
    },
  });

  if (loading) return <Skeleton className="h-32 rounded-xl" />;

  if (items.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Keine ausstehenden Urlaubsanträge. Alles erledigt! ✅
          </p>
        </CardContent>
      </Card>
    );
  }

  const typeLabels: Record<string, string> = {
    urlaub: "Urlaub",
    sonderurlaub: "Sonderurlaub",
    unbezahlt: "Unbezahlter Urlaub",
  };

  return (
    <div className="space-y-2">
      {items.map((req) => (
        <Card key={req.id} className="rounded-xl">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {typeLabels[req.type] ?? req.type} · {req.work_days_count} Tage
                </p>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(req.start_date)} – {fmtDate(req.end_date)}
                </p>
                {req.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {req.reason}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-700 hover:text-green-800 hover:bg-green-50 size-8 px-2"
                  onClick={() => reviewMutation.mutate({ id: req.id, action: "approve" })}
                  disabled={reviewMutation.isPending}
                  title="Genehmigen"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-700 hover:text-red-800 hover:bg-red-50 size-8 px-2"
                  onClick={() => reviewMutation.mutate({ id: req.id, action: "reject" })}
                  disabled={reviewMutation.isPending}
                  title="Ablehnen"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
