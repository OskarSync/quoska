import type { Metadata } from "next";
import { LegalValue } from "@/components/marketing/legal-value";
import { legalInfo, site } from "@/lib/site";
import { legalStandDate } from "@/config/server/site-meta";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung gemäß § 5 TMG und § 18 MStV.",
  alternates: { canonical: "/impressum" },
  openGraph: {
    title: "Impressum | Quoska",
    description: "Anbieterkennzeichnung gemäß § 5 TMG und § 18 MStV.",
    type: "article",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
        Anbieterkennzeichnung
      </p>
      <h1>Impressum</h1>
      <p className="text-sm">
        Angaben gemäß §&nbsp;5 TMG (Telemediengesetz) und §&nbsp;18 MStV
        (Medienstaatsvertrag).
      </p>

      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          ⚠️ Hinweis (nur in der Entwicklung sichtbar): Die mit <code>[TODO:]</code>{" "}
          markierten Felder müssen vor dem Live-Gang mit den echten
          Anbieterdaten (nach Gewerbe- bzw. Handelsregister-Anmeldung) ausgefüllt
          werden. Siehe <code>src/lib/site.ts</code> und{" "}
          <code>OPERATIONS/LEGAL.md</code>.
        </p>
      )}

      <h2>Diensteanbieter</h2>
      <p>
        <LegalValue value={legalInfo.operatorName} />
        <br />
        <LegalValue value={legalInfo.legalForm} />
        <br />
        <LegalValue value={legalInfo.street} />
        <br />
        <LegalValue value={legalInfo.zipCity} />
        <br />
        <LegalValue value={legalInfo.country} />
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: <LegalValue value={legalInfo.phone} />
        <br />
        E-Mail:{" "}
        <a href={`mailto:${legalInfo.email.replace("[TODO: ", "").replace("]", "")}`}>
          <LegalValue value={legalInfo.email} />
        </a>
      </p>

      {legalInfo.registry && !legalInfo.registry.includes("[TODO:") && (
        <>
          <h2>Registereintrag</h2>
          <p>
            <LegalValue value={legalInfo.registry} />
          </p>
        </>
      )}

      <h2>Umsatzsteuer</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß §&nbsp;27a Umsatzsteuergesetz
        (UStG):
        <br />
        <LegalValue value={legalInfo.vatId} />
      </p>

      {!legalInfo.taxNumber.includes("[TODO") && legalInfo.taxNumber !== "[TODO: optional]" && (
        <p>
          Steuernummer (Finanzamt): <LegalValue value={legalInfo.taxNumber} />
        </p>
      )}

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        Verantwortlich im Sinne des §&nbsp;18 Abs.&nbsp;2 MStV:
        <br />
        <LegalValue value={legalInfo.responsibleForContent} />
      </p>

      {legalInfo.insurance && (
        <>
          <h2>Berufshaftpflichtversicherung</h2>
          <p>
            <LegalValue value={legalInfo.insurance} />
          </p>
        </>
      )}

      <h2>Streitschlichtung</h2>
      <p>{legalInfo.disputeResolution}</p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß §&nbsp;7 Abs.&nbsp;1 TMG für eigene
        Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
        Nach §§&nbsp;8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
        überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von
        entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
        entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
        Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
        verantwortlich.
      </p>
      <p>
        Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne
        konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
        Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
        entfernen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
        Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
        jeweiligen Autors bzw. Erstellers.
      </p>
      <p>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden,
        werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
        Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
        Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
        entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden
        wir derartige Inhalte umgehend entfernen.
      </p>

      <p className="mt-8 text-xs text-slate-400">
        Stand: {legalStandDate} · {site.name}
      </p>
    </article>
  );
}
