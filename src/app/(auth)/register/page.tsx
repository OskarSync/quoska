/**
 * Registration page — create company account.
 *
 * Flow:
 * 1. Sign up with Supabase Auth (email + password)
 * 2. POST /api/v1/auth/register to create tenant + admin employee
 * 3. Redirect to /setup for onboarding wizard
 *
 * Uses React Hook Form + Zod for validation.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import { registerInputSchema, type RegisterInput } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Step 1: Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });

      if (authError) {
        // Map common Supabase errors to German messages
        if (authError.message.includes("already registered")) {
          setServerError("Diese E-Mail ist bereits registriert.");
        } else {
          setServerError(
            "Registrierung fehlgeschlagen. Bitte versuche es erneut."
          );
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setServerError("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
        return;
      }

      // Step 2: Create tenant + admin employee via API
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          companyName: values.companyName,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setServerError(
          result.error ||
            "Ein Fehler ist aufgetreten. Bitte versuche es erneut."
        );
        return;
      }

      // Step 2.5: Refresh the session so the JWT picks up the new custom claims
      await supabase.auth.refreshSession();

      // Step 3: Redirect to setup wizard (full navigation to ensure middleware picks up session)
      // eslint-disable-next-line react-hooks/immutability -- full navigation needed for cookie propagation
      window.location.href = "/setup";
    } catch {
      setServerError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">
        Unternehmen registrieren
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Firmenname</Label>
          <Input
            id="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Müller GmbH"
            {...register("companyName")}
          />
          {errors.companyName && (
            <p className="text-xs text-destructive">
              {errors.companyName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@firma.de"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          {isSubmitting ? "Registrierung…" : "Kostenlos registrieren"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Schon ein Account?{" "}
        <Link
          href="/login"
          className="font-medium text-violet-600 hover:text-violet-700"
        >
          Anmelden
        </Link>
      </p>
    </div>
  );
}
