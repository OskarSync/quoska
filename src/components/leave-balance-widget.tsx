/**
 * Leave Balance Widget — Shows entitlement, used, pending, available days.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Palmtree } from "lucide-react";

interface LeaveBalanceData {
  total: number;
  used: number;
  pending: number;
  available: number;
  carried_over: number;
}

export function LeaveBalanceWidget({ employeeId }: { employeeId?: string }) {
  const url = employeeId
    ? `/api/v1/leave-entitlements/${employeeId}`
    : "/api/v1/leave-entitlements/me";

  const { data, isLoading } = useQuery<LeaveBalanceData>({
    queryKey: ["leaveBalance", employeeId],
    queryFn: async () => {
      const res = await fetch(url);
      const json: ApiResponse<LeaveBalanceData> = await res.json();
      return json.data!;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  if (!data) return null;

  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center size-7 rounded-lg bg-emerald-100 text-emerald-600">
            <Palmtree className="size-4" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Urlaubskontingent
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <BalanceItem label="Anspruch" value={data.total} />
          <BalanceItem label="Genehmigt" value={data.used} variant="used" />
          <BalanceItem label="Ausstehend" value={data.pending} variant="pending" />
          <BalanceItem label="Verfügbar" value={data.available} variant={data.available <= 3 ? "low" : "available"} />
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceItem({ label, value, variant }: { label: string; value: number; variant?: string }) {
  const colorMap: Record<string, string> = {
    used: "text-blue-700 bg-blue-50",
    pending: "text-amber-700 bg-amber-50",
    low: "text-red-700 bg-red-50",
    available: "text-emerald-700 bg-emerald-50",
  };
  const color = colorMap[variant ?? ""] ?? "text-gray-700 bg-gray-50";

  return (
    <div className={`rounded-lg p-2 ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
    </div>
  );
}
