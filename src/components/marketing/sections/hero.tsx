import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Server, FileCheck2, Lock } from "lucide-react";

const TRUST = [
  { icon: ShieldCheck, label: "ArbZG-konform" },
  { icon: Lock, label: "DSGVO + AVV" },
  { icon: Server, label: "Server Frankfurt" },
  { icon: FileCheck2, label: "Revisionssicher" },
] as const;

/**
 * Hero — anchored on the German legal trigger (EuGH/BAG), not on a generic
 * "be more productive" pitch. Concrete price, concrete obligation, concrete
 * proof points.
 */
export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
      {/* Subtle dotted grid + soft violet glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:gap-10">
        {/* Copy */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-violet-600" />
            </span>
            Seit dem BAG-Urteil 2022 gesetzlich Pflicht
          </div>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.07] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Zeiterfassung,{" "}
            <span className="text-violet-600">
              die vor dem Arbeitsschutz besteht.
            </span>
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Quoska erfasst Arbeitszeiten lückenlos, berechnet Pausen nach{" "}
            <strong className="font-semibold text-slate-800">§&nbsp;4&nbsp;ArbZG</strong>{" "}
            automatisch und ist revisionssicher.{" "}
            <strong className="font-semibold text-slate-800">
              39&nbsp;€ im Monat
            </strong>{" "}
            für das ganze Team — egal wie viele Mitarbeiter.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="flex-1 sm:flex-none">
              <Button className="h-12 w-full bg-violet-600 px-7 text-base text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 sm:w-auto">
                In 2 Minuten starten
              </Button>
            </Link>
            <Link href="/#preise" className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                className="h-12 w-full border-slate-300 px-7 text-base sm:w-auto"
              >
                Preise ansehen
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Keine Kreditkarte nötig · Bis 3 Mitarbeiter dauerhaft gratis · Jederzeit kündbar
          </p>

          {/* Trust row */}
          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
            {TRUST.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"
              >
                <Icon className="size-4 text-violet-600" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Product mock — looks like the real clock card */}
        <div className="relative lg:pl-4">
          <ClockMock />
        </div>
      </div>
    </section>
  );
}

/** Lightweight, static mock of the in-app clock card. */
function ClockMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Floating "compliance ok" chip */}
      <div className="absolute -left-3 top-6 z-10 hidden rotate-[-6deg] rounded-xl border border-emerald-200 bg-white px-3 py-2 shadow-lg sm:block">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          ArbZG ✓
        </p>
        <p className="text-xs text-slate-500">Pause eingehalten</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Heute · Mi, 18. Juni
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              Anna · Bäckerei Müller
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Eingestempelt
          </span>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-mono text-4xl font-bold tabular-nums text-slate-900">
            06:24:51
          </span>
          <span className="text-sm text-slate-400">laufend</span>
        </div>

        {/* Progress to 8h target */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Arbeitszeit heute</span>
            <span className="font-medium text-slate-700">6h 24m / 8h</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: "80%" }}
            />
          </div>
        </div>

        {/* Break log */}
        <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Pause (12:00 – 12:30)</span>
            <span className="font-medium text-slate-700">30 min · §4 ArbZG ✓</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Projekt</span>
            <span className="font-medium text-slate-700">Verkauf / Theke</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm"
          tabIndex={-1}
          aria-hidden="true"
        >
          Ausstempeln
        </button>
      </div>

      {/* floating audit chip */}
      <div className="absolute -bottom-4 -right-3 z-10 hidden rotate-[5deg] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:block">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Audit-Trail
        </p>
        <p className="text-xs text-slate-600">jede Änderung protokolliert</p>
      </div>
    </div>
  );
}
