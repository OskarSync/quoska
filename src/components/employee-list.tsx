/**
 * EmployeeList — Client component showing active and deactivated employees.
 *
 * Uses React Query for data fetching and invalidation.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";
import { EmployeeAddDialog } from "@/components/employee-add-dialog";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface PlanStatus {
  plan: string | null;
  activeCount: number;
  limit: number | null;
  canAddMore: boolean;
}

interface EmployeeListResponse {
  active: Employee[];
  deactivated: Employee[];
  planStatus: PlanStatus | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Mitarbeiter",
};

export function EmployeeList({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees");
      const json: ApiResponse<EmployeeListResponse> = await res.json();
      return json.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PUT",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Deaktivieren");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const handleDeactivate = (employee: Employee) => {
    setDeactivateError(null);
    const name = `${employee.first_name} ${employee.last_name}`.trim();
    if (!confirm(`${name} wirklich deaktivieren?`)) return;
    deactivateMutation.mutate(employee.id, {
      onError: (err) => setDeactivateError(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const active = employeeData?.active ?? [];
  const deactivated = employeeData?.deactivated ?? [];
  const planStatus = employeeData?.planStatus;
  const atPlanLimit = planStatus && !planStatus.canAddMore;

  return (
    <div className="space-y-6">
      {deactivateError && (
        <Alert variant="destructive">
          <AlertDescription>{deactivateError}</AlertDescription>
        </Alert>
      )}

      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} aktive Mitarbeiter
        </p>
        {isAdmin && (
          atPlanLimit ? (
            <span className="text-sm text-muted-foreground">
              Max. {planStatus?.limit} Mitarbeiter im kostenlosen Tarif.{" "}
              <a href="/app/settings" className="text-primary underline">
                Jetzt upgraden →
              </a>
            </span>
          ) : (
            <Button onClick={() => setShowAddDialog(true)}>
              Hinzufügen
            </Button>
          )
        )}
      </div>

      {/* Active employees */}
      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Mitarbeiter hinzugefügt.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          {active.map((emp, index) => (
            <div key={emp.id}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.email} · {ROLE_LABELS[emp.role] ?? emp.role}
                    {emp.target_hours_week && ` · ${emp.target_hours_week}h/Woche`}
                  </p>
                  {emp.invitation_token && (
                    <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800 border-0">
                      Einladung ausstehend
                    </Badge>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditEmployee(emp)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeactivate(emp)}
                      disabled={deactivateMutation.isPending}
                    >
                      Deaktivieren
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deactivated employees */}
      {deactivated.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeactivated(!showDeactivated)}
            className="gap-2 px-0"
          >
            <span className={`transition-transform ${showDeactivated ? "rotate-90" : ""}`}>
              ▸
            </span>
            Deaktivierte Mitarbeiter ({deactivated.length})
          </Button>

          {showDeactivated && (
            <div className="mt-2 rounded-lg border opacity-60">
              {deactivated.map((emp, index) => (
                <div key={emp.id}>
                  {index > 0 && <Separator />}
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium line-through">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.email} · {ROLE_LABELS[emp.role] ?? emp.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <EmployeeAddDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}

      {editEmployee && (
        <EmployeeEditDialog
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
    </div>
  );
}
