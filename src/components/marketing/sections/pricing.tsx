import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  cta: { label: string; href: string; primary?: boolean };
  features: { label: string; included: boolean }[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "0 €",
    period: "/Monat",
    tagline: "Für Kleinbetriebe und zum Ausprobieren.",
    cta: { label: "Kostenlos starten", href: "/register" },
    features: [
      { label: "Bis 3 Mitarbeiter", included: true },
      { label: "Kommen, Pause, Gehen", included: true },
      { label: "Pausen- & Ruhezeit-Warnungen", included: true },
      { label: "Mitarbeiter-Self-Service", included: true },
      { label: "CSV-Export", included: true },
      { label: "Unbegrenzte Mitarbeiter", included: false },
      { label: "Urlaub & Krankheit", included: false },
      { label: "Projekt-Zuordnung", included: false },
    ],
  },
  {
    name: "Team",
    price: "39 €",
    period: "/Monat",
    tagline: "Die Flatrate für dein gesamtes Team. Keine Pro-Kopf-Kosten.",
    cta: { label: "Team-Flatrate wählen", href: "/register", primary: true },
    highlight: true,
    features: [
      { label: "Unbegrenzte Mitarbeiter", included: true },
      { label: "Alles aus Free", included: true },
      { label: "Urlaub & Krankheit (AU-Upload)", included: true },
      { label: "Projekt- & Kundenzuordnung", included: true },
      { label: "Feiertage nach Bundesland", included: true },
      { label: "Audit-Trail & Korrektur-Workflow", included: true },
      { label: "AVV-Vertrag zum Download", included: true },
      { label: "Priorisierter E-Mail-Support", included: true },
    ],
  },
  {
    name: "Pro",
    price: "79 €",
    period: "/Monat",
    tagline: "Für wachsende Betriebe mit Buchhaltung & API-Bedarf.",
    cta: { label: "Frühzeitige Anfrage", href: "/register" },
    features: [
      { label: "Alles aus Team", included: true },
      { label: "DATEV-Export", included: false },
      { label: "API-Zugang", included: false },
      { label: "Mehrere Standorte", included: false },
      { label: "Zuschlagsberechnung (Nacht/Wochenende)", included: false },
      { label: "Priorisierter Telefon-Support", included: true },
      { label: "Onboarding-Begleitung", included: true },
      { label: "SLA & Backup-Garantie", included: true },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="preise">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Preise
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ein fairer Preis. Egal, wie groß dein Team wird.
          </h2>
          <p className="mt-3 text-slate-600">
            Keine versteckten Kosten, kein Pro-Kopf-Hammer. Alle Preise zzgl. Umsatzsteuer.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm",
                plan.highlight
                  ? "border-violet-300 ring-2 ring-violet-500 lg:-mt-3 lg:mb-3"
                  : "border-slate-200",
              ].join(" ")}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Beliebt
                </span>
              )}

              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-slate-500">{plan.period}</span>
                )}
              </div>

              <Link href={plan.cta.href} className="mt-5">
                <Button
                  className={
                    plan.cta.primary
                      ? "w-full bg-violet-600 text-white hover:bg-violet-700"
                      : "w-full"
                  }
                  variant={plan.cta.primary ? "default" : "outline"}
                >
                  {plan.cta.label}
                </Button>
              </Link>

              <ul className="mt-6 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Minus className="mt-0.5 size-4 shrink-0 text-slate-300" />
                    )}
                    <span className={f.included ? "text-slate-700" : "text-slate-400"}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Pro-Tarif (DATEV, API, Multi-Standort) ist Teil von Phase 3 und noch in
          Arbeit. Trag dich gern schon jetzt ein.
        </p>
      </div>
    </section>
  );
}
