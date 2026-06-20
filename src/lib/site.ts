/**
 * Central site + legal configuration.
 *
 * ⚠️  IMPRESSUM / DATENSCHUTZ PLACEHOLDERS
 * -----------
 * Quoska's operating company is NOT YET registered (see
 * (your internal legal entity registration notes)). Every field below that holds
 * real operator data (name, address, tax IDs, contact) MUST be filled in by
 * Oskar before going live. Do not invent or guess these values.
 *
 * The legal prose in the legal pages (TMG/§5, DSGVO/Art. 13, AGB) is template
 * text and is canonical — only the operator fields need real data.
 */

export const site = {
  name: "Quoska",
  tagline: "Zeiterfassung für deutsche KMU",
  /** Production origin — set NEXT_PUBLIC_APP_URL in .env */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://quoska.app",
  /** Hero / marketing language is German (de-DE). */
  locale: "de-DE",
} as const;

/**
 * Operator (Anbieter i.S.d. § 5 TMG / § 18 MStV).
 *
 * TODO(oskar): Replace every [TODO: ...] field once the entity is registered.
 * Until then these are visible placeholders so nothing ships with fake data.
 */
export const legalInfo = {
  operatorName: "[TODO: Vorname Nachname]" as string,
  legalForm: "[TODO: Einzelunternehmen / UG / GmbH]" as string,
  street: "[TODO: Straße Hausnummer]" as string,
  zipCity: "[TODO: PLZ Ort]" as string,
  country: "Deutschland",
  /** Telefon — optional but expected on a German Impressum. */
  phone: "[TODO: +49 ...]" as string,
  email: "[TODO: kontakt@quoska.app]" as string,
  /** Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG. */
  vatId: "[TODO: DE123456789]" as string,
  /** Steuernummer (Finanzamt) — darf im Impressum stehen, muss aber nicht. */
  taxNumber: "[TODO: optional]" as string,
  /** Handelsregister / Registernummer (nur bei HR-pflichtigen Firmen). */
  registry: "[TODO: Amtsgericht …, HRB … — oder streichen]" as string,
  /** Berufshaftpflichtversicherung — Pflichtangabe nur für freie Berufe. */
  insurance: null as string | null,
  /** Verantwortlich für den Inhalt i.S.d. § 18 Abs. 2 MStV. */
  responsibleForContent: "[TODO: Vorname Nachname, Anschrift wie oben]" as string,
  /**
   * Streitschlichtung: Verbraucherstreitbeilegung / OS-Plattform der EU.
   * Pflichtangabe nach § 36 VBSG / Art. 14 OVO.
   */
  disputeResolution:
    "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." as string,
  /** Redaktionell Verantwortlicher gemäß § 18 Abs. 2 MStV. */
  supervisoryAuthority: null as string | null,
} as const;

/**
 * Sub-processor (Auftragsverarbeiter) for DSGVO disclosure.
 * Supabase hosts in Frankfurt (EU). Update if hosting changes.
 */
export const processors = [
  {
    name: "Supabase Inc.",
    purpose: "Hosting, Authentifizierung und Datenbank (PostgreSQL)",
    location: "Frankfurt am Main, Deutschland (EU)",
    privacyUrl: "https://supabase.com/privacy",
    website: "https://supabase.com",
  },
  {
    name: "Vercel Inc.",
    purpose: "Hosting der Web-Anwendung (Edge Network / CDN)",
    location: "EU-Region (Server in Frankfurt / Amsterdam)",
    privacyUrl: "https://vercel.com/legal/privacy-policy",
    website: "https://vercel.com",
  },
] as const;

/** Quick check used to surface a visible warning in dev when placeholders remain. */
export function hasUnfilledLegalInfo(): boolean {
  return Object.values(legalInfo).some(
    (v) => typeof v === "string" && v.includes("[TODO:")
  );
}
