/**
 * EmployeeAddDialog — Modal form to invite a new employee.
 *
 * Uses useMutation to POST /api/v1/employees.
 * All UI text in German (de-DE).
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BUNDESLAENDER, BUNDESLAND_LABELS } from "@/types/tenant";
import type { Bundesland } from "@/types/tenant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmployeeAddDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeAddDialog({ onClose, onSuccess }: EmployeeAddDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [targetHours, setTargetHours] = useState("40");
  const [bundesland, setBundesland] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          role,
          targetHoursWeek: Number(targetHours),
          bundesland: bundesland || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Hinzufügen");
      return json;
    },
    onSuccess,
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter hinzufügen</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-firstName">Vorname</Label>
            <Input
              id="add-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-lastName">Nachname</Label>
            <Input
              id="add-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-email">E-Mail</Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Rolle</Label>
            <Select value={role} onValueChange={(v) => { if (v !== null) setRole(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Mitarbeiter</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-targetHours">Wochenstunden (Soll)</Label>
            <Input
              id="add-targetHours"
              type="number"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              min="1"
              max="48"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-bundesland">Bundesland</Label>
            <Select value={bundesland} onValueChange={(v) => setBundesland(v ?? "")}>
              <SelectTrigger id="add-bundesland" className="w-full">
                <SelectValue placeholder="Nicht festgelegt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nicht festgelegt</SelectItem>
                {BUNDESLAENDER.map((bl: Bundesland) => (
                  <SelectItem key={bl} value={bl}>
                    {BUNDESLAND_LABELS[bl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Wird hinzugefügt…" : "Einladen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
