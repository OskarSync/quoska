/**
 * Projects Page — /app/projects
 *
 * Admin/manager: manage projects, assign employees.
 */

"use client";

import { ProjectList } from "@/components/project-list";

export default function ProjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Projekte und Kunden verwalten, Mitarbeitern zuordnen.
        </p>
      </div>
      <ProjectList />
    </div>
  );
}
