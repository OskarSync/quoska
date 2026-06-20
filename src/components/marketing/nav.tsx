"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/#features", label: "Funktionen" },
  { href: "/#preise", label: "Preise" },
  { href: "/#faq", label: "FAQ" },
] as const;

/**
 * Marketing nav — sticky, blurred, with mobile menu.
 * Used on landing page and as a lighter variant on legal pages.
 */
export function MarketingNav({
  variant = "default",
}: {
  variant?: "default" | "legal";
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Quoska — Startseite"
        >
          {/* Plain <img>: next/image's optimizer + cache was serving a stale
              smaller raster whenever logo.png changed. A 32px icon gets no
              benefit from the optimizer, so we skip it for predictability. */}
          <img
            src="/icons/logo.png"
            alt="Quoska"
            width={26}
            height={26}
            className="size-[26px] shrink-0"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Quoska
          </span>
        </Link>

        {variant === "default" && (
          <>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Anmelden
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                >
                  Kostenlos testen
                </Button>
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </>
        )}

        {variant === "legal" && (
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              ← Zur Startseite
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile menu */}
      {variant === "default" && open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3 sm:px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Anmelden
                </Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  className="w-full bg-violet-600 text-white hover:bg-violet-700"
                >
                  Testen
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
