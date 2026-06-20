export const FAQ = [
  {
    q: "Ist eine elektronische Zeiterfassung wirklich gesetzlich vorgeschrieben?",
    a: "Ja. Der Europäische Gerichtshof (EuGH, C-55/18, 14. Mai 2019) hat entschieden, dass Mitgliedsstaaten Arbeitgeber verpflichten müssen, die tägliche Arbeitszeit systematisch zu erfassen. Das Bundesarbeitsgericht (BAG, 1 ABR 22/21, 13. September 2022) hat bestätigt, dass dies in Deutschland aufgrund des geltenden Arbeitszeitgesetzes sofort gilt. Die geplante ArbZG-Reform regelt die elektronische Erfassung zusätzlich für die Zukunft.",
  },
  {
    q: "Was kostet Quoska bei 20 Mitarbeitern?",
    a: "39 € im Monat — Punkt. Im Team-Tarif ist die Anzahl der Mitarbeiter unbegrenzt. Bei den meisten Wettbewerbern zahlst du für 20 Personen zwischen 110 € und 160 € pro Monat. Bis 3 Mitarbeiter ist Quoska dauerhaft kostenlos.",
  },
  {
    q: "Wo werden meine Daten gespeichert?",
    a: "Ausschließlich in der EU — konkret in Frankfurt am Main (Supabase / PostgreSQL). Es findet keine Übermittlung in Drittstaaten statt. Mit der Einrichtung erhältst du einen Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO zum Download.",
  },
  {
    q: "Wie wird die Revisionssicherheit gewährleistet?",
    a: "Jeder Zeit-Eintrag erhält einen unveränderbaren Originaldatensatz mit vom Server gesetztem Zeitstempel (Schutz vor Manipulation der Client-Uhr). Änderungen werden in einem separaten, nur-anhängbaren Audit-Log protokolliert: wer, wann, was wurde geändert, alter und neuer Wert. Hard-Deletes gibt es nicht — Einträge werden mit Begründung als gelöscht markiert. Aufbewahrt wird 2 Jahre gemäß §16 Abs. 2 ArbZG, danach erfolgt die automatische Löschung.",
  },
  {
    q: "Können Mitarbeiter ihre eigenen Zeiten einsehen?",
    a: "Ja. Das ArbZG verlangt, dass Beschäftigte Zugriff auf ihre aufgezeichneten Arbeitszeiten haben. Jede:r Mitarbeiter:in bekommt eine eigene Self-Service-Ansicht für die eigenen Zeiten und kann Korrekturanträge stellen, die der Arbeitgeber freigeben muss.",
  },
  {
    q: "Was passiert, wenn ich kündige?",
    a: "Du kannst jederzeit kündigen — ohne Frist, ohne Mindestlaufzeit. Auf Wunsch exportierst du alle Daten als CSV und löscht deinen Account samt Daten nach Ablauf der gesetzlichen Aufbewahrungsfrist vollständig.",
  },
  {
    q: "Bekommt Quoska Zugriff auf Lohn- oder Gehaltsdaten?",
    a: "Nein. Quoska ist reine Zeiterfassung — keine Lohnabrechnung, kein Payroll. Das vermeidet sowohl Rechtsrisiken als auch unnötige Datenflüsse. Für die Lohnabrechnung exportierst du die fertigen Stundenzettel.",
  },
  {
    q: "Funktioniert das auch auf dem Handy der Mitarbeiter?",
    a: "Ja. Quoska ist als Progressive Web App (PWA) ausgelegt und läuft im Handy-Browser — ohne App-Store. Stempeln, Pause und Korrekturen funktionieren unterwegs. GPS-Tracking gibt es standardmäßig nicht und ist nur optional zuschaltbar.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Häufige Fragen
          </h2>
          <p className="mt-3 text-slate-600">
            Kein Marketing-Blabla — konkrete Antworten zu Recht, Preis und Datenschutz.
          </p>
        </div>

        <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {FAQ.map((item, i) => (
            <details key={i} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50">
                <span className="text-sm font-semibold text-slate-900 sm:text-base">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="ml-2 flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0 text-sm leading-relaxed text-slate-600">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Noch Fragen? Schreib uns — wir antworten in der Regel innerhalb eines Werktages.
        </p>
      </div>
    </section>
  );
}
