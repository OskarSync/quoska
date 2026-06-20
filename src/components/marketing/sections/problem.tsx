import { AlertTriangle, Scale, Coins } from "lucide-react";

const POINTS = [
  {
    icon: Scale,
    title: "Arbeitszeitgesetz ist bindend",
    body: "Seit dem EuGH-Urteil (C-55/18, 2019) und dem Beschluss des BAG (1 ABR 22/21, September 2022) ist die systematische Erfassung der Arbeitszeit in Deutschland verpflichtend — nicht erst mit der ArbZG-Reform 2026.",
  },
  {
    icon: AlertTriangle,
    title: "Bußgelder bis 30.000 €",
    body: "Wer die Arbeitszeit nicht oder nicht korrekt erfasst, riskiert Bußgelder der Aufsichtsbehörde. In Mindestlohnbranchen (Bau, Gastro, Pflege) sogar bis zu 500.000 €. Fehlende oder manipulierte Aufzeichnungen sind vor dem Arbeitsgericht wertlos.",
  },
  {
    icon: Coins,
    title: "Pro-Kopf-Preise frusten",
    body: "Die meisten Anbieter berechnen 3–8 € pro Mitarbeiter und Monat. Bei 20 Personen zahlst du schnell 110–160 €. Quoska kostet 39 € — für die komplette Belegschaft. Flatrate, ohne Wenn und Aber.",
  },
] as const;

/**
 * The "why now" section — educates the German buyer on the legal pressure and
 * the pricing trap. Concrete, sourced, no hype.
 */
export function ProblemSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Warum jetzt?
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Zeiterfassung ist keine Kür. Sie ist gesetzliche Pflicht.
          </h2>
          <p className="mt-3 text-slate-600">
            Drei Gründe, warum deutsche Betriebe heute handeln — nicht irgendwann.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
