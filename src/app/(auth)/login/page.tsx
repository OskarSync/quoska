"use client";

/**
 * Login page — email + password authentication.
 *
 * Uses React Hook Form + Zod for validation.
 * On success redirects to /app/dashboard.
 * On failure shows generic German error (no hint which field is wrong).
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import { loginInputSchema, type LoginInput } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError("E-Mail oder Passwort falsch");
        return;
      }

      const redirectTo = searchParams.get("redirect") || "/app/dashboard";
      // eslint-disable-next-line react-hooks/immutability -- full navigation needed for cookie propagation
      window.location.href = redirectTo;
    } catch {
      setServerError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">Anmelden</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
          {isSubmitting ? "Anmeldung…" : "Anmelden"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Noch kein Account?{" "}
        <Link
          href="/register"
          className="font-medium text-violet-600 hover:text-violet-700"
        >
          Registrieren
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div>
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">Anmelden</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">E-Mail</label>
              <div className="h-9 rounded-md bg-gray-100 animate-pulse" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Passwort</label>
              <div className="h-9 rounded-md bg-gray-100 animate-pulse" />
            </div>
            <div className="h-9 rounded-md bg-gray-100 animate-pulse" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
