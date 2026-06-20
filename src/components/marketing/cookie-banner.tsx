"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

const STORAGE_KEY = "quoska:cookie-consent:v1";

/**
 * Minimal, DSGVO-honest consent banner.
 *
 * Quoska uses ONLY technically necessary cookies (Supabase session cookie on
 * the login/register area). There is no tracking, no analytics, no advertising
 * on the public site. This banner makes that explicit and is therefore not a
 * "fake" consent wall — it documents that nothing tracks the visitor.
 *
 * If tracking/analytics is added later, extend this to a real consent
 * management (opt-in per purpose) before going live.
 *
 * Visibility is driven by an external store (localStorage + an in-memory
 * listeners set) via useSyncExternalStore, so:
 *   - SSR always renders the banner hidden (no hydration mismatch), and
 *   - there is no setState-in-effect (no cascading render).
 */
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) notify();
}

function getSnapshot(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, "acknowledged");
  } catch {
    // storage may be unavailable (private mode) — fall back to in-memory
  }
  notify();
}

export function CookieBanner() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Cookie consent is a public marketing-site concern only. It must not
  // appear on authenticated product routes (/app/*) or the auth/setup flows
  // (/login, /register, /setup), where it would block UI interactions.
  // Checked client-side only — the banner is already hidden during SSR
  // (getServerSnapshot=false), so there is no hydration mismatch.
  const PRODUCT_ROUTE_PREFIXES = ["/app", "/login", "/register", "/setup"];
  const isProductRoute =
    typeof window !== "undefined" &&
    PRODUCT_ROUTE_PREFIXES.some((p) => window.location.pathname.startsWith(p));

  if (!visible || isProductRoute) return null;

  return (
    <div
      role="dialog"
      aria-label="Hinweis zu Cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Cookie className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">
              Nur technisch notwendige Cookies.
            </strong>{" "}
            Wir setzen kein Tracking und keine Werbung ein. Die Sitzungs-Cookies
            für die Anmeldung sind technisch erforderlich. Details in der{" "}
            <Link
              href="/datenschutz"
              className="font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={dismiss}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              Verstanden
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hinweis schließen"
          className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
