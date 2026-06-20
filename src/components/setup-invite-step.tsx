"use client";

import { FREE_PLAN_EMPLOYEE_LIMIT } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface InviteRow {
  firstName: string;
  lastName: string;
  email: string;
}

interface InviteStepProps {
  invites: InviteRow[];
  setInvites: (invites: InviteRow[]) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export function InviteStep({
  invites,
  setInvites,
  onSubmit,
  onBack,
  loading,
  error,
}: InviteStepProps) {
  function addRow() {
    if (invites.length < FREE_PLAN_EMPLOYEE_LIMIT - 1) {
      setInvites([...invites, { firstName: "", lastName: "", email: "" }]);
    }
  }

  function updateRow(index: number, field: keyof InviteRow, value: string) {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  }

  function removeRow(index: number) {
    setInvites(invites.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Lade dein Team ein (optional). Max.{" "}
        {FREE_PLAN_EMPLOYEE_LIMIT - 1} weitere Mitarbeiter im kostenlosen
        Tarif.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invites.map((invite, index) => (
        <Card key={index} size="sm">
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Mitarbeiter {index + 1}
                </span>
                {invites.length > 1 && (
                  <Button
                    variant="link"
                    size="xs"
                    className="text-destructive px-0"
                    onClick={() => removeRow(index)}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={invite.firstName}
                  onChange={(e) => updateRow(index, "firstName", e.target.value)}
                  placeholder="Vorname"
                />
                <Input
                  value={invite.lastName}
                  onChange={(e) => updateRow(index, "lastName", e.target.value)}
                  placeholder="Nachname"
                />
              </div>
              <Input
                value={invite.email}
                onChange={(e) => updateRow(index, "email", e.target.value)}
                placeholder="E-Mail"
                type="email"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {invites.length < FREE_PLAN_EMPLOYEE_LIMIT - 1 && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addRow}
        >
          + Mitarbeiter hinzufügen
        </Button>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Zurück
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Wird eingeladen..." : "Einladen & Weiter"}
        </Button>
      </div>
    </div>
  );
}
