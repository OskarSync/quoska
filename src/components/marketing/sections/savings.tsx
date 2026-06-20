const COMPETITORS = [
  { name: "Clockodo", price20: "110 €", note: "pro Kopf" },
  { name: "Crewmeister", price20: "118 €", note: "pro Kopf" },
  { name: "TimeTac", price20: "160 €", note: "pro Kopf" },
] as const;

/** Concrete price comparison — the core differentiator (Flatrate vs. Pro-Kopf). */
export function SavingsSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
              Die Rechnung
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Bei 20 Mitarbeitern sparst du über 1.400 € im Jahr.
            </h2>
            <p className="mt-3 text-slate-600">
              Die meisten Zeiterfassungen berechnen pro Mitarbeiter. Quoska
              nicht. Gleiche Pflicht, deutlich weniger Kosten — egal, ob dein
              Team wächst.
            </p>

            <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                  Quoska Team
                </p>
                <p className="text-2xl font-extrabold text-slate-900">468 €/Jahr</p>
              </div>
              <span className="text-2xl text-slate-300">vs.</span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Wettbewerb Ø
                </p>
                <p className="text-2xl font-extrabold text-slate-400 line-through decoration-slate-300">
                  ~1.920 €/Jahr
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Preisvergleich bei 20 Mitarbeitern
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Monatliche Kosten, gerundet, Stand 2026.
            </p>

            <ul className="mt-4 space-y-2">
              {COMPETITORS.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-200"
                >
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <span className="font-semibold text-slate-500">{c.price20}/Monat</span>
                </li>
              ))}
              <li className="flex items-center justify-between rounded-lg bg-violet-600 px-4 py-3 text-sm text-white shadow-md shadow-violet-600/30">
                <span className="font-semibold">Quoska Team</span>
                <span className="font-bold">39 €/Monat</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Bis 3 Mitarbeiter ist Quoska sogar komplett gratis.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
