import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      {/* glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-violet-600/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 size-72 rounded-full bg-fuchsia-600/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Schluss mit Excel-Listen und Zetteln.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300">
          Starte heute, sei in zwei Minuten compliant und zahle nie wieder pro
          Mitarbeiter. Keine Kreditkarte nötig.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button className="h-12 w-full bg-violet-600 px-8 text-base text-white hover:bg-violet-500 sm:w-auto">
              Jetzt kostenlos starten
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              className="h-12 w-full border-slate-600 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Ich habe schon einen Account
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Vertrauen entsteht durch Transparenz: Hosting in Frankfurt, AVV inklusive,
          jederzeit kündbar.
        </p>
      </div>
    </section>
  );
}
