import type { Metadata } from "next";
import { LegalValue } from "@/components/marketing/legal-value";
import { legalInfo, processors, site } from "@/lib/site";
import { legalStandDate } from "@/config/server/site-meta";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung gemäß Art. 13/14 DSGVO für die Zeiterfassungs-Software Quoska.",
  alternates: { canonical: "/datenschutz" },
  openGraph: {
    title: "Datenschutzerklärung | Quoska",
    description:
      "Datenschutzerklärung gemäß Art. 13/14 DSGVO für die Zeiterfassungs-Software Quoska.",
    type: "article",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};

export default function DatenschutzPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
        Datenschutz
      </p>
      <h1>Datenschutzerklärung</h1>
      <p className="text-sm">
        Gemäß Art.&nbsp;13 und 14 der Datenschutz-Grundverordnung (DSGVO).
      </p>

      <p>
        Wir nehmen den Schutz deiner personenbezogenen Daten ernst und behandeln
        sie vertraulich und entsprechend der gesetzlichen
        Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.
        Mit nachfolgender Information geben wir dir einen Überblick über die
        Verarbeitung deiner personenbezogenen Daten durch uns und deine Rechte
        aus dem Datenschutzrecht.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website und im Rahmen
        der Nutzung der Software „Quoska“ ist:
      </p>
      <p>
        <LegalValue value={legalInfo.operatorName} />
        <br />
        <LegalValue value={legalInfo.street} />
        <br />
        <LegalValue value={legalInfo.zipCity} />
        <br />
        E-Mail:{" "}
        <a href={`mailto:${legalInfo.email.replace("[TODO: ", "").replace("]", "")}`}>
          <LegalValue value={legalInfo.email} />
        </a>
      </p>

      <h2>2. Datenschutzbeauftragte:r</h2>
      <p>
        Als kleines Unternehmen sind wir nach §&nbsp;38 BDSG nicht zur Benennung
        eines betrieblichen Datenschutzbeauftragten verpflichtet. Anfragen zum
        Datenschutz richtest du bitte an die oben genannte E-Mail-Adresse mit
        dem Betreff „Datenschutz“.
      </p>

      <h2>3. Allgemeines zur Verarbeitung</h2>
      <p>
        Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur,
        soweit dies zur Bereitstellung einer funktionsfähigen Website sowie
        unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung
        erfolgt regelmäßig nur nach Einwilligung der Nutzer (Art.&nbsp;6 Abs.&nbsp;1
        lit.&nbsp;a DSGVO), zur Vertragserfüllung (Art.&nbsp;6 Abs.&nbsp;1
        lit.&nbsp;b DSGVO), zur Erfüllung rechtlicher Verpflichtungen
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;c DSGVO) oder auf Grundlage
        berechtigter Interessen (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO).
      </p>

      <h2>4. Server-Logfiles</h2>
      <p>
        Beim Aufrufen der Website werden durch den Hosting-Anbieter automatisch
        Informationen sog. Server-Logfiles erhoben und gespeichert. Diese sind:
        Browsertyp und -version, verwendetes Betriebssystem, Referrer-URL,
        Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und
        IP-Adresse (gekürzt / anonymisiert, soweit technisch möglich).
      </p>
      <p>
        Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO
        (berechtigtes Interesse an der technischen Auslieferung und
        IT-Sicherheit). Die Speicherdauer beträgt in der Regel 7 Tage und dient
        der Abwehr von Angriffen.
      </p>

      <h2>5. Kontaktaufnahme</h2>
      <p>
        Wenn du uns per E-Mail kontaktierst, werden die von dir mitgeteilten
        Daten (E-Mail-Adresse, Name, Betreff, Nachricht) zur Bearbeitung deiner
        Anfrage gespeichert. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1
        lit.&nbsp;b bzw. lit.&nbsp;f DSGVO. Diese Daten geben wir nicht ohne deine
        Einwilligung weiter.
      </p>

      <h2>6. Registrierung und Nutzung der Software (Vertrag)</h2>
      <p>
        Um Quoska zu nutzen, kannst du ein Benutzerkonto anlegen. Dabei
        verarbeiten wir folgende Daten: Firmenname, Name und E-Mail-Adresse des
        Administrators, sowie die von dir angelegten Mitarbeiter:innen (Name,
        E-Mail-Adresse, Soll-Arbeitszeit, Rolle).
      </p>
      <p>
        <strong>Zweck:</strong> Bereitstellung einer gesetzlich vorgeschriebenen{" "}
        Arbeitszeiterfassung gemäß Arbeitszeitgesetz (ArbZG) sowie Durchführung
        des Vertragsverhältnisses. <strong>Rechtsgrundlagen:</strong>{" "}
        Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b (Vertrag) und lit.&nbsp;c DSGVO
        (gesetzliche Aufbewahrungspflicht nach §&nbsp;16 Abs.&nbsp;2 ArbZG).
      </p>
      <p>
        <strong>Speicherdauer:</strong> Arbeitszeitbezogene Daten werden zwei
        Jahre nach Entstehen aufbewahrt und danach automatisch gelöscht. Kontodaten
        werden gelöscht, sobald das Vertragsverhältnis endet und keine
        Aufbewahrungspflichten mehr entgegenstehen.
      </p>

      <h2>7. Auftragsverarbeiter (Art. 28 DSGVO)</h2>
      <p>
        Für die Erbringung der Dienstleistung setzen wir folgende
        Auftragsverarbeiter ein. Mit jedem besteht ein Auftragsverarbeitungsvertrag
        (AVV), der den Anforderungen des Art.&nbsp;28 DSGVO entspricht. Kunden
        (Arbeitgeber) können den AVV nach Registrierung im Konto herunterladen.
      </p>
      <ul>
        {processors.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> — {p.purpose}; Standort: {p.location}.{" "}
            Datenschutzerklärung:{" "}
            <a href={p.privacyUrl} target="_blank" rel="noopener noreferrer">
              {p.privacyUrl}
            </a>
            .
          </li>
        ))}
      </ul>

      <h2>8.Hosting in der EU</h2>
      <p>
        Sämtliche Verarbeitung personenbezogener Daten findet auf Servern
        innerhalb der Europäischen Union statt. Eine Übermittlung in
        Drittstaaten außerhalb der EU/des EWR findet nicht statt.
      </p>

      <h2>9. Kein Tracking, keine Werbung</h2>
      <p>
        Wir setzen auf den öffentlichen Seiten kein Tracking, keine
        Reichweitenmessung (z.&nbsp;B. Google Analytics), kein Remarketing und
        keine Werbe-Cookies ein. Es werden ausschließlich technisch notwendige
        Cookies verwendet (Sitzungs-Cookie nach Login). Daher ist auch keine
        Einwilligung im Sinne des §&nbsp;25 Abs.&nbsp;2 TTDSG erforderlich.
      </p>

      <h2>10. Deine Rechte als betroffene Person</h2>
      <p>Du hast uns gegenüber folgende Rechte:</p>
      <ul>
        <li>Auskunft über deine verarbeiteten Daten (Art.&nbsp;15 DSGVO),</li>
        <li>Berichtigung unrichtiger Daten (Art.&nbsp;16 DSGVO),</li>
        <li>Löschung (Art.&nbsp;17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art.&nbsp;18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art.&nbsp;20 DSGVO),</li>
        <li>Widerspruch gegen die Verarbeitung (Art.&nbsp;21 DSGVO),</li>
        <li>
          Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft
          (Art.&nbsp;7 Abs.&nbsp;3 DSGVO).
        </li>
      </ul>
      <p>
        Zudem hast du das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über
        die Verarbeitung deiner personenbezogenen Daten zu beschweren
        (Art.&nbsp;77 DSGVO).
      </p>

      <h2>11. Widerspruchsrecht (Art. 21 DSGVO)</h2>
      <p>
        Soweit die Verarbeitung auf Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;e oder
        lit.&nbsp;f DSGVO beruht, hast du das Recht, aus Gründen, die sich aus
        deiner besonderen Situation ergeben, jederzeit gegen die Verarbeitung
        Widerspruch einzulegen. Im Falle eines Widerspruchs verarbeiten wir deine
        Daten nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe
        nachweisen.
      </p>

      <h2>12. Datenminimierung &amp; Datensicherheit</h2>
      <p>
        Wir erfassen nur die Daten, die für die vertragliche und gesetzliche
        Pflicht zur Arbeitszeiterfassung erforderlich sind. Eine GPS- oder
        Standorterfassung findet standardmäßig nicht statt und ist ausschließlich
        optional zuschaltbar. Die Datenübertragung erfolgt verschlüsselt über
        HTTPS/TLS. Zugangskontrollen, regelmäßige Backups und eine strikte
        Trennung der Mandanten (Tenant-Isolation) verhindern den unbefugten
        Zugriff zwischen verschiedenen Arbeitgebern.
      </p>

      <h2>13. Mitarbeitendendaten (Hinweis für Arbeitgeber)</h2>
      <p>
        Wenn du als Arbeitgeber Quoska einsetzt, legst du Daten deiner
        Beschäftigten an. Für diese Verarbeitung bist du selbst Verantwortlicher.
        Wir empfehlen, das Informations- oder Mitbestimmungsrecht des Betriebs-
        oder Personalrats sowie die Transparenzpflicht gegenüber den
        Beschäftigten zu beachten und die Mitarbeitenden über die Verarbeitung zu
        informieren.
      </p>

      <h2>14. Aktualität und Änderung</h2>
      <p>
        Diese Datenschutzerklärung kann sich ändern, insbesondere wenn wir neue
        Funktionen einführen oder sich die Rechtslage ändert. Die jeweils
        aktuelle Version ist auf dieser Seite abrufbar.
      </p>

      <p className="mt-8 text-xs text-slate-400">
        Stand: {legalStandDate} · {site.name}
      </p>
    </article>
  );
}
