/**
 * Leave Request List — Shows own leave requests with status badges and cancel action.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaveRequest {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  work_days_count: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: string | null;
  review_note: string | null;
}

interface LeaveRequestListProps {
  role?: string;
}

export function LeaveRequestList({ role }: LeaveRequestListProps) {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leaveRequests"],
    queryFn: async () => {
      const res = await fetch("/api/v1/leave-requests");
      const json: ApiResponse<LeaveRequest[]> = await res.json();
      return json.data ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/leave-requests/${id}`, { method: "DELETE" });
      const json: ApiResponse<LeaveRequest> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Stornieren");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (!requests || requests.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Keine Urlaubsanträge vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Ausstehend", variant: "outline" },
    approved: { label: "Genehmigt", variant: "default" },
    rejected: { label: "Abgelehnt", variant: "destructive" },
    cancelled: { label: "Storniert", variant: "secondary" },
  };

  const typeLabels: Record<string, string> = {
    urlaub: "Urlaub",
    sonderurlaub: "Sonderurlaub",
    unbezahlt: "Unbezahlter Urlaub",
  };

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const cfg = statusConfig[req.status] ?? statusConfig.pending;
        const canCancel = req.status === "pending" || req.status === "approved";
        const isManagerView = role === "admin" || role === "manager";

        return (
          <Card key={req.id} className="rounded-xl">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">
                      {typeLabels[req.type] ?? req.type}
                    </span>
                    <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(req.start_date)} – {fmtDate(req.end_date)} · {req.work_days_count} Arbeitstage
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {req.reason}
                    </p>
                  )}
                  {req.review_note && (req.status === "rejected") && (
                    <p className="text-xs text-red-600 mt-0.5 truncate">
                      Ablehnungsgrund: {req.review_note}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {canCancel && !isManagerView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground text-xs"
                      onClick={() => cancelMutation.mutate(req.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Stornieren
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
