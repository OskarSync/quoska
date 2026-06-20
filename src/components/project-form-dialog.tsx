/**
 * ProjectFormDialog — Create/edit project dialog.
 * Extracted from ProjectList to keep files under 300 lines.
 *
 * Uses a key prop from the parent to force remount on open/edit changes,
 * avoiding useEffect for state sync.
 */

"use client";

import { useState } from "react";
import type { ProjectWithStats } from "@/types";
import { PROJECT_COLORS } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface ProjectFormDialogProps {
  /** Pass editProject only when editing. Component remounts via key when it changes. */
  editProject: ProjectWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    customer_name: string | null;
    color: string;
  }) => void;
  isPending: boolean;
}

export function ProjectFormDialog({
  editProject,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ProjectFormDialogProps) {
  const [formName, setFormName] = useState(editProject?.name ?? "");
  const [formCustomer, setFormCustomer] = useState(
    editProject?.customer_name ?? "",
  );
  const [formColor, setFormColor] = useState<string>(
    editProject?.color ?? PROJECT_COLORS[0],
  );
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit() {
    setFormError(null);
    if (!formName.trim()) {
      setFormError("Name ist erforderlich");
      return;
    }
    onSubmit({
      name: formName,
      customer_name: formCustomer || null,
      color: formColor,
    });
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setFormName("");
      setFormCustomer("");
      setFormColor(PROJECT_COLORS[0]);
      setFormError(null);
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Projekt hinzufügen
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editProject ? "Projekt bearbeiten" : "Neues Projekt"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name *</Label>
            <Input
              id="project-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="z.B. Website Redesign"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-customer">Kunde</Label>
            <Input
              id="project-customer"
              value={formCustomer}
              onChange={(e) => setFormCustomer(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-6 rounded-full border-2 transition-all ${
                    formColor === c
                      ? "border-gray-900 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFormColor(c)}
                />
              ))}
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1"
            >
              {editProject ? "Speichern" : "Erstellen"}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
