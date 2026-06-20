import type { Metadata } from "next";
import Link from "next/link";
import { LegalValue } from "@/components/marketing/legal-value";
import { legalInfo, site } from "@/lib/site";
import { legalStandDate } from "@/config/server/site-meta";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description:
    "Widerrufsbelehrung und Muster-Widerrufsformular für Verbraucher im Sinne des § 13 BGB.",
  alternates: { canonical: "/widerruf" },
  openGraph: {
    title: "Widerrufsrecht | Quoska",
    description:
      "Widerrufsbelehrung und Muster-Widerrufsformular für Verbraucher im Sinne des § 13 BGB.",
    type: "article",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};

export default function WiderrufPage() {
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
        Verbraucherschutz
      </p>
      <h1>Widerrufsrecht</h1>

      <p className="text-sm">
        Hinweis: Quoska richtet sich überwiegend an Unternehmer im Sinne des
        §&nbsp;14 BGB (Geschäftskunden). Unternehmern steht nach §&nbsp;312g
        Abs.&nbsp;2 Nr.&nbsp;1 BGB kein Widerrufsrecht zu. Die nachfolgende
        Belehrung gilt daher nur für Verbraucher im Sinne des §&nbsp;13 BGB.
      </p>

      <h2>Widerrufsbelehrung</h2>
      <p>
        <strong>Verbraucher</strong> (natürliche Person, die einen Rechtsakt zu
        Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer
        selbständigen beruflichen Tätigkeit zugerechnet werden können) haben ein
        Widerrufsrecht.
      </p>

      <h3>Widerrufsrecht</h3>
      <p>
        Du hast das Recht, diesen Vertrag binnen vierzehn Tagen ohne Angabe von
        Gründen zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem
        Tag des Vertragsabschlusses.
      </p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns (<LegalValue value={legalInfo.operatorName} />, <LegalValue value={legalInfo.street} />, <LegalValue value={legalInfo.zipCity} />, E-Mail:{" "}
        <a href={`mailto:${legalInfo.email.replace("[TODO: ", "").replace("]", "")}`}>
          <LegalValue value={legalInfo.email} />
        </a>
        ) mittels einer eindeutigen Erklärung (z.&nbsp;B. ein mit der Post
        versandter Brief oder eine E-Mail) über deinen Entschluss, diesen
        Vertrag zu widerrufen, informieren.
      </p>
      <p>
        Du kannst dafür das beigefügte Muster-Widerrufsformular verwenden, das
        jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht
        es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor
        Ablauf der Widerrufsfrist absendest.
      </p>

      <h3>Folgen des Widerrufs</h3>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir
        von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der
        zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der
        Lieferung als die von uns angebotene, günstigste Standardlieferung
        gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem
        Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses
        Vertrags bei uns eingegangen ist.
      </p>
      <p>
        Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei
        der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde
        ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen
        dieser Rückzahlung Entgelte berechnet.
      </p>
      <p>
        Hast du verlangt, dass die Dienstleistung während der Widerrufsfrist
        beginnen soll, hast du uns einen angemessenen Betrag zu zahlen, der dem
        Anteil der bis zu dem Zeitpunkt, zu dem du uns von der Ausübung des
        Widerrufsrechts hinsichtlich dieses Vertrags unterrichtest, erbrachten
        Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag
        vorgesehenen Dienstleistungen entspricht.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>
        (Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus
        und sende es zurück.)
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
{`An
${legalInfo.operatorName}
${legalInfo.street}
${legalInfo.zipCity}
E-Mail: ${legalInfo.email}

— Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag
  über den Kauf der folgenden Waren (*) / die Erbringung der folgenden
  Dienstleistung (*)

— Bestellt am (*) / erhalten am (*)

— Name des/der Verbraucher(s)

— Anschrift des/der Verbraucher(s)

— Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)

— Datum
___________________
(*) Unzutreffendes streichen.`}
      </pre>

      <p className="mt-8">
        Rückfragen zum Widerruf beantworten wir per E-Mail. Siehe auch unsere{" "}
        <Link href="/agb">AGB</Link> und die <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <p className="mt-8 text-xs text-slate-400">
        Stand: {legalStandDate} · {site.name}
      </p>
    </article>
  );
}
