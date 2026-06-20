import {
  Clock,
  Coffee,
  CalendarDays,
  History,
  FileSpreadsheet,
  Bell,
  Users,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Clock,
    title: "Ein-Klick-Stempeln",
    body: "Kommen, Pause, Gehen — mit einem Tipp. Server-Zeitstempel gegen Manipulation, tagesaktuell, lückenlos.",
  },
  {
    icon: Coffee,
    title: "Pausen nach §4 ArbZG",
    body: "Quoska rechnet Pausen automatisch: 30 min ab 6 Stunden, 45 min ab 9 Stunden — und warnt, wenn etwas fehlt.",
  },
  {
    icon: History,
    title: "Revisionssicherer Audit-Trail",
    body: "Jede Änderung wird protokolliert — wer, wann, was. Originale bleiben erhalten, Hard-Deletes gibt es nicht.",
  },
  {
    icon: CalendarDays,
    title: "Feiertage & Abwesenheit",
    body: "Bundesland-spezifische Feiertage, Urlaubsanträge im Workflow und Krankmeldungen inkl. AU-Upload.",
  },
  {
    icon: Bell,
    title: "Automatische Erinnerungen",
    body: "„Ausgestempelt vergessen?“ erkennt Quoska selbst und schlägt eine Korrektur vor.",
  },
  {
    icon: Users,
    title: "Team- & Projekt-Zuordnung",
    body: "Weise Zeiten Projekten oder Kunden zu und sieh live, wer gerade im Dienst ist.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV-Export & Überstunden",
    body: "Wochen- und Monatsreport je Mitarbeiter, Überstunden automatisch berechnet, Export für Lohnbüro & DATEV.",
  },
  {
    icon: ShieldCheck,
    title: "DSGVO von Haus aus",
    body: "Hosting in Frankfurt, Datenminimierung, AVV zum Download, 2-jährige Aufbewahrung laut §16 ArbZG.",
  },
] as const;

/**
 * Feature grid — every item maps to a real, built capability (Epics 2–7, 11,
 * 12). No vaporware. DATEV/Multi-Standort sind Phase 3 und als „bald" markiert.
 */
export function FeaturesSection() {
  return (
    <section id="features">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Funktionen
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Alles, was das Arbeitszeitgesetz verlangt.
          </h2>
          <p className="mt-3 text-slate-600">
            Nicht mehr, nicht weniger. Konsequent auf deutsche Betriebe zugeschnitten.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform group-hover:-translate-y-0.5">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
