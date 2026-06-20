/**
 * ProjectList — Admin project management.
 *
 * Supports: create, edit, soft-delete, assign/unassign employees.
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ProjectWithStats } from "@/types";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { ProjectAssignPanel } from "@/components/project-assign-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Users } from "lucide-react";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export function ProjectList() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editProject, setEditProject] = useState<ProjectWithStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["projects", showInactive],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/projects${showInactive ? "?all=true" : ""}`,
      );
      const json: ApiResponse<ProjectWithStats[]> = await res.json();
      return json.data ?? [];
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees");
      const json = await res.json();
      const data = json.data as {
        active: Employee[];
        deactivated: Employee[];
      } | null;
      if (!data) return [];
      return data.active ?? [];
    },
  });

  const openAssign = useCallback(
    (projectId: string) => {
      setAssignProjectId((prev) =>
        prev === projectId ? null : projectId,
      );
    },
    [],
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      customer_name: string | null;
      color: string;
    }) => {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      customer_name: string | null;
      color: string;
    }) => {
      const res = await fetch(`/api/v1/projects/${editProject!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditProject(null);
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  function openEdit(project: ProjectWithStats) {
    setEditProject(project);
    setDialogOpen(true);
  }

  function handleFormSubmit(data: {
    name: string;
    customer_name: string | null;
    color: string;
  }) {
    if (editProject) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Projekte</h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Inaktive anzeigen
          </label>
        </div>
        <ProjectFormDialog
          key={editProject?.id ?? "__create__"}
          editProject={dialogOpen ? editProject : null}
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditProject(null);
          }}
          onSubmit={handleFormSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </div>

      {projects && projects.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Noch keine Projekte. Erstelle dein erstes Projekt.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {projects?.map((project) => (
          <Card key={project.id} className="rounded-xl">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: project.color ?? "#6366f1",
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {project.name}
                      </span>
                      {project.customer_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {project.customer_name}
                        </span>
                      )}
                      {!project.active && (
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          Inaktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.employee_count} Mitarbeiter
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openAssign(project.id)}
                    title="Mitarbeiter zuordnen"
                  >
                    <Users className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(project)}
                    title="Bearbeiten"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(project.id)}
                    title="Löschen"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5 text-red-500" />
                  </Button>
                </div>
              </div>

              {assignProjectId === project.id && (
                <ProjectAssignPanel
                  projectId={project.id}
                  employees={employees ?? []}
                  onClose={() => setAssignProjectId(null)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
