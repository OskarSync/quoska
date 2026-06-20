/**
 * ProjectSelector — Dropdown for selecting a project when clocking in.
 * Only shown when the employee has project assignments.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface ProjectSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export function ProjectSelector({ value, onValueChange }: ProjectSelectorProps) {
  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ["myProjects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects?assigned=true");
      const json: ApiResponse<ProjectOption[]> = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  // No projects assigned — don't show selector at all
  if (!projects || projects.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
        <Briefcase className="size-3" />
        Projekt
      </label>
      <Select
        value={value ?? "none"}
        onValueChange={(v: string | null) => onValueChange(v === "none" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Kein Projekt" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Kein Projekt</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                {p.color && (
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
