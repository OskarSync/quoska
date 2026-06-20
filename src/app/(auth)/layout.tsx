/**
 * Auth layout — split-screen layout for login/register.
 * Inspired by Toggl/Clockify's clean auth pages.
 */

import type { ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { currentYear } from "@/config/server/site-meta";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[480px] xl:lg:w-[520px] bg-violet-600 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800" />
        <div className="relative flex flex-col justify-between w-full p-10 text-white">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-10 rounded-lg bg-white">
              <Image src="/icons/logo.png" alt="Quoska" width={30} height={30} priority />
            </div>
            <span className="text-lg font-bold">Quoska</span>
          </div>

          {/* Center message */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold leading-snug">
              Zeiterfassung,{" "}
              <span className="text-violet-200">die dein Team mag.</span>
            </h2>
            <p className="text-violet-200 text-sm leading-relaxed">
              Einfach, compliant und fair bepreist.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                "Gesetzlich konform (ArbZG, DSGVO)",
                "39 € Flatrate — egal wie viele Mitarbeiter",
                "In 2 Minuten eingerichtet",
              ].map((text) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-violet-100">
                  <div className="flex items-center justify-center size-5 rounded-full bg-white/15 shrink-0">
                    <Check className="size-3 text-white" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom */}
          <div className="space-y-1 text-xs text-violet-300">
            <p>© {currentYear} Quoska</p>
            <p>
              <a href="/datenschutz" className="underline-offset-2 hover:underline">Datenschutz</a>
              {" · "}
              <a href="/impressum" className="underline-offset-2 hover:underline">Impressum</a>
              {" · "}
              <a href="/agb" className="underline-offset-2 hover:underline">AGB</a>
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center justify-center size-14 rounded-xl bg-violet-600 mb-3">
              <Image src="/icons/logo.png" alt="Quoska" width={32} height={32} className="rounded-md bg-white p-1" priority />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Quoska
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Zeiterfassung für dein Team
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
