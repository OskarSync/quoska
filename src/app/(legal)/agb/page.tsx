import type { Metadata } from "next";
import { LegalValue } from "@/components/marketing/legal-value";
import { legalInfo, site } from "@/lib/site";
import { legalStandDate } from "@/config/server/site-meta";

export const metadata: Metadata = {
  title: "AGB",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung der Zeiterfassungs-Software Quoska.",
  alternates: { canonical: "/agb" },
  openGraph: {
    title: "AGB | Quoska",
    description:
      "Allgemeine Geschäftsbedingungen für die Nutzung der Zeiterfassungs-Software Quoska.",
    type: "article",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};

export default function AgbPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
        Vertragsbedingungen
      </p>
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p className="text-sm">
        Stand: {legalStandDate} · Anbieter:{" "}
        <LegalValue value={legalInfo.operatorName} />
      </p>

      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          ⚠️ Hinweis (nur Entwicklung): Dies ist ein AGB-Entwurf für ein
          B2B-SaaS. Vor dem Live-Gang durch eine anwaltliche Prüfung (z.&nbsp;B.
          IT-Recht / Händlerbund) final freigeben lassen. Anbieterdaten in{" "}
          <code>src/lib/site.ts</code> eintragen.
        </p>
      )}

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der
        webbasierten Software „Quoska“ (nachfolgend „Software“) sowie der
        damit verbundenen Dienstleistungen durch den Kunden. Sie gelten
        ausschließlich; entgegenstehende oder abweichende Bedingungen des Kunden
        erkennen wir nicht an, es sei denn, wir hätten ausdrücklich ihrer Geltung
        zugestimmt.
      </p>

      <h2>§ 2 Vertragsgegenstand und Leistungen</h2>
      <p>
        (1) Gegenstand des Vertrages ist die zeitlich befristete,
        nicht-ausschließliche Einräumung eines Nutzungsrechts an der
        cloudbasierten Zeiterfassungs-Software Quoska gemäß dem gewählten
        Tarif (Free, Team oder Pro) und der jeweils aktuellen Leistungsbeschreibung.
      </p>
      <p>
        (2) Die Software unterstützt die Erfüllung der gesetzlichen Pflicht zur
        Arbeitszeiterfassung (ArbZG). Die rechtliche Prüfung der Einsatzbedingungen
        im jeweiligen Betrieb obliegt dem Kunden. Eine Beratung zu
        arbeitsrechtlichen Einzelfällen wird nicht geschuldet.
      </p>
      <p>
        (3) Die Software ersetzt keine Rechts- oder Steuerberatung und keine
        Lohnabrechnung.
      </p>

      <h2>§ 3 Vertragsschluss</h2>
      <p>
        (1) Der Vertrag kommt zustande durch die Registrierung des Kunden über
        das Anmeldeformular und die anschließende Bestätigung durch Freischaltung
        des Kontos.
      </p>
      <p>
        (2) Der Kunde versichert, dass die bei der Registrierung angegebenen
        Daten vollständig und richtig sind.
      </p>

      <h2>§ 4 Tarife und Vergütung</h2>
      <p>
        (1) Es gelten die zum Zeitpunkt der Buchung auf{" "}
        <a href={site.url}>{site.url}</a> ausgewiesenen Preise. Die
        monatlichen Preise verstehen sich als Nettopreise zzgl. der gesetzlich
        geltenden Umsatzsteuer.
      </p>
      <p>
        (2) Der Tarif „Free“ ist für Betriebe bis zu drei Mitarbeitenden
        kostenlos. Der Tarif „Team“ kostet 39 € netto je Monat bei unbegrenzter
        Mitarbeiterzahl. Der Tarif „Pro“ kostet 79 € netto je Monat; einzelne
        Pro-Funktionen (z.&nbsp;B. DATEV-Export) sind ggf. noch nicht verfügbar
        und werden gesondert ausgewiesen.
      </p>
      <p>
        (3) Zahlungen sind monatlich im Voraus fällig. Zahlungsverzug führt
        nach erfolgloser Mahnung zur vorübergehenden Sperrung des Kontos.
      </p>

      <h2>§ 5 Laufzeit und Kündigung</h2>
      <p>
        (1) Das Vertragsverhältnis ist monatlich kündbar, erstmals zum Ende des
        Abrechnungsmonats. Die Kündigung erfolgt in Textform (z.&nbsp;B. E-Mail).
      </p>
      <p>
        (2) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt
        unberührt. Ein wichtiger Grund liegt für uns insbesondere vor, wenn der
        Kunde mit Zahlungen in Höhe von zwei Monatsentgelten in Verzug gerät oder
        schuldhaft gegen wesliche Pflichten dieser AGB verstößt.
      </p>
      <p>
        (3) Unabhängig von der Kündigung bleiben gesetzliche
        Aufbewahrungspflichten (§&nbsp;16 Abs.&nbsp;2 ArbZG: zwei Jahre) bestehen.
        Daten werden nach Ablauf der Pflicht automatisch gelöscht.
      </p>

      <h2>§ 6 Pflichten des Kunden</h2>
      <p>
        (1) Der Kunde sorgt für die technischen Voraussetzungen (Internetzugang,
        aktueller Browser, ggf. mobile Endgeräte).
      </p>
      <p>
        (2) Zugangsdaten sind vertraulich zu behandeln und vor unbefugtem Zugriff
        durch Dritte geschützt aufzubewahren. Der Kunde haftet für die Nutzung
        seines Kontos durch Dritte, sofern er dies zu vertreten hat.
      </p>
      <p>
        (3) Der Kunde ist für die Richtigkeit und Vollständigkeit der erfassten
        Arbeitszeiten sowie für die Einhaltung arbeits- und datenschutzrechtlicher
        Pflichten gegenüber seinen Beschäftigten verantwortlich. Dies umfasst
        die Information der Mitarbeitenden über die Datenerfassung.
      </p>
      <p>
        (4) Der Kunde darf die Software nicht missbräuchlich nutzen, insbesondere
        nicht zur Verarbeitung gesetzwidriger Inhalte oder zur Störung des
        Betriebs verwenden.
      </p>

      <h2>§ 7 Verfügbarkeit und Wartung</h2>
      <p>
        (1) Wir bemühen uns um eine Verfügbarkeit der Software von 99,5 % im
        Jahresdurchschnitt. Geplante Wartungsarbeiten werden nach Möglichkeit
        außerhalb der üblichen Geschäftszeiten angekündigt.
      </p>
      <p>
        (2) Kurzzeitige Unterbrechungen aufgrund von Wartung, Updates oder
        Störungen beim Hosting-Anbieter bleiben vorbehalten und berechtigen nicht
        zur Minderung, soweit sie unvermeidbar sind.
      </p>

      <h2>§ 8 Datensicherheit, Datenschutz und Auftragsverarbeitung</h2>
      <p>
        (1) Eine Auftragsverarbeitungsvereinbarung (AVV) nach Art.&nbsp;28 DSGVO
        steht dem Kunden nach Registrierung im Konto zum Download zur Verfügung
        und wird mit Vertragsbeginn Vertragsbestandteil.
      </p>
      <p>
        (2) Es gelten unsere separaten Hinweise in der{" "}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>§ 9 Gewährleistung und Haftung</h2>
      <p>
        (1) Wir gewährleisten die Erbringung der vertragsgemäßen Leistungen nach
        dem Stand der Technik. Die Software wird „wie besehen“ bereitgestellt;
        eine Fehlerfreiheit kann nicht zugesichert werden.
      </p>
      <p>
        (2) Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie
        nach den gesetzlichen Bestimmungen für Personenschäden und nach dem
        Produkthaftungsgesetz.
      </p>
      <p>
        (3) Im Übrigen haften wir bei leichter Fahrlässigkeit nur bei Verletzung
        einer wesentlichen Vertragspflicht (Kardinalpflicht), deren Verletzung den
        Vertragszweck gefährdet, und nur in Höhe des vorhersehbaren,
        vertragstypischen Schadens. Eine Haftung für Datenverlust ist auf den
        typischen Wiederherstellungsaufwand beschränkt, der bei regelmäßiger
        Datensicherung durch den Kunden entstanden wäre.
      </p>

      <h2>§ 10 Schlussbestimmungen</h2>
      <p>
        (1) Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt die
        Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
      <p>
        (2) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
        UN-Kaufrechts (CISG).
      </p>
      <p>
        (3) Gerichtsstand ist — soweit gesetzlich zulässig — der Sitz des
        Anbieters, sofern der Kunde Unternehmer, juristische Person des
        öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.
      </p>

      <p className="mt-8 text-xs text-slate-400">
        Stand: {legalStandDate} · {site.name}
      </p>
    </article>
  );
}
