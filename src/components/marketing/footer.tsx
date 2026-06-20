import Link from "next/link";
import Image from "next/image";
import { currentYear } from "@/config/server/site-meta";

const FOOTER_LINKS = [
  {
    title: "Produkt",
    links: [
      { href: "/#features", label: "Funktionen" },
      { href: "/#preise", label: "Preise" },
      { href: "/#faq", label: "FAQ" },
      { href: "/register", label: "Kostenlos testen" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutzerklärung" },
      { href: "/agb", label: "AGB" },
      { href: "/widerruf", label: "Widerrufsrecht" },
    ],
  },
  {
    title: "Konto",
    links: [
      { href: "/login", label: "Anmelden" },
      { href: "/register", label: "Registrieren" },
    ],
  },
] as const;

/** Shared marketing footer with all legally required links. */
export function MarketingFooter() {
  const year = currentYear;

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icons/logo.png"
                alt="Quoska"
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Quoska
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Zeiterfassung für deutsche KMU. Gesetzlich compliant, fair
              bepreist, in Deutschland entwickelt.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              🇩🇪 Made in Germany · Server in Frankfurt
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-violet-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {year} Quoska — Zeiterfassung für deutsche KMU.</p>
          <p className="text-slate-400">
            Alle Rechte vorbehalten. Irrtümer vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
