import { UserPlus, Send, Stamp } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Account anlegen",
    body: "Firma, E-Mail, Passwort — in 2 Minuten eingerichtet. Keine Kreditkarte, kein Termin.",
  },
  {
    icon: Send,
    step: "02",
    title: "Team einladen",
    body: "Mitarbeiter per E-Mail hinzufügen, Soll-Stunden und Rolle festlegen. Fertig.",
  },
  {
    icon: Stamp,
    step: "03",
    title: "Stempeln & auswerten",
    body: "Ein Klick zum Kommen und Gehen. Pausen, Überstunden und Reports werden automatisch erfasst.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            So funktioniert&apos;s
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            In drei Schritten startklar.
          </h2>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, step, title, body }, i) => (
            <li key={step} className="relative">
              {/* connector line on desktop */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+2.5rem)] top-7 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-slate-300 to-transparent md:block"
                />
              )}
              <div className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200">
                  <Icon className="size-6" />
                  <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
