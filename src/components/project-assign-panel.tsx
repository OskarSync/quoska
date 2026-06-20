/**
 * ProjectAssignPanel — Inline panel for assigning/unassigning employees.
 * Extracted from ProjectList to keep files under 300 lines.
 *
 * Uses react-query for data fetching instead of useEffect+setState.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface ProjectAssignPanelProps {
  projectId: string;
  employees: Employee[];
  onClose: () => void;
}

export function ProjectAssignPanel({
  projectId,
  employees,
  onClose,
}: ProjectAssignPanelProps) {
  const queryClient = useQueryClient();

  // Fetch current assignments
  const { data: assignedIds = [], isLoading } = useQuery<string[]>({
    queryKey: ["projectAssignments", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/assign`);
      const json: ApiResponse<string[]> = await res.json();
      return json.data ?? [];
    },
  });

  // Track local selection starting from server state
  const [selected, setSelected] = useState<Set<string> | null>(null);

  // Derive the working set: once loaded, use local edits; until then, use server
  const workingIds = selected ?? new Set(assignedIds);
  const initialSet = new Set(assignedIds);

  const mutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const res = await fetch(`/api/v1/projects/${projectId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_ids: employeeIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });

  function toggle(empId: string) {
    setSelected((prev) => {
      const next = new Set(prev ?? assignedIds);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }

  const hasChanges =
    workingIds.size !== initialSet.size ||
    [...workingIds].some((id) => !initialSet.has(id));

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      <p className="text-xs font-medium">Mitarbeiter zuordnen:</p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Laden…</p>
      ) : employees.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Keine aktiven Mitarbeiter vorhanden.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {employees.map((emp) => {
            const isAssigned = workingIds.has(emp.id);
            return (
              <label
                key={emp.id}
                className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${
                  isAssigned ? "font-medium" : "text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => toggle(emp.id)}
                  className="rounded"
                />
                {emp.first_name} {emp.last_name}
              </label>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!hasChanges || mutation.isPending}
          onClick={() => mutation.mutate([...workingIds])}
        >
          {mutation.isPending ? "Speichern…" : "Änderungen speichern"}
        </Button>
        {!hasChanges && !mutation.isPending && (
          <span className="text-xs text-muted-foreground">
            Keine Änderungen
          </span>
        )}
      </div>
    </div>
  );
}
