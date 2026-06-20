<p align="center">
  <img src="public/banner.png" alt="Quoska" width="833">
</p>

<h1 align="center">Quoska</h1>

<p align="center">
  <strong>Gesetzlich vorgeschriebene Zeiterfassung für deutsche KMU — als Flatrate.</strong><br>
  Pausen nach §4 ArbZG, revisionssicherer Audit-Trail, DSGVO-konform. Staffelpreise nach Teamgröße — ab 9 €/Monat, ohne Pro-Kopf-Abrechnung.
</p>

<p align="center">
  <a href="https://quoska.app">Hosted Service</a> ·
  <a href="#-selbst-hosting">Selbst hosten</a> ·
  <a href="docs">Dokumentation</a>
</p>

---

Quoska ist die Arbeitzeit-Erfassung, die das Arbeitszeitgesetz (ArbZG) von sich aus fordert: Server-seitige Zeitstempel, unveränderlicher Audit-Trail, harte Pausen- und Ruhezeiten, 2-jährige Aufbewahrung (§16 ArbZG) — als schlanke Flatrate statt Pro-Kopf-Preis wie bei der Konkurrenz.

---

## Zwei Wege, Quoska zu nutzen

| Option | Beschreibung |
| --- | --- |
| **[Hosted Service](https://quoska.app)** | Am schnellsten startklar — EU-gehostet, AVV-Vertrag, Updates inklusive. |
| **Selbst hosten** | Dieser Codebase. Komplett kontrollierbar auf dem eigenen Server. Siehe [Selbst-Hosting](#-selbst-hosting). |

> **Open Source, nicht Open-Core.** Die gesamte Anwendung ist offen — auch das
> Stripe-Billing. Ohne konfigurierte Stripe-Schlüssel läuft die App im
> Kostenlos-Tarif (3 Mitarbeiter); die gleiche Codebasis wird mit Schlüsseln
> zur kostenpflichtigen Flatrate. Kein Feature-Gating, keine ausgelagerten
> Module.

---

## Preise

Flatrate nach Teamgröße — kein Pro-Kopf-Preis, keine unliebsamen Überraschungen.

| Plan | Preis | Teamgröße | Für wen |
| --- | --- | --- | --- |
| **Free** | €0 | bis 3 | Testen, Solo, Kleinstbetriebe |
| **Team** | **€9/Monat** | bis 10 | Handwerk, kleine Büros — das Kernmarkt-Segment |
| **Business** | €59/Monat | bis 50 | Wachsende KMU |
| **Pro** | €99/Monat | unbegrenzt | Größere Betriebe |

Zum Vergleich: klassische Pro-Kopf-Tools kosten ~6 €/Mitarbeiter — bei 10 Mitarbeitern also ~60 €, bei 30 ~180 €. Quoska bleibt bei 9 € bzw. 59 € flat.

---

## Funktionen

- **Stempeluhr** — Einstempeln, Ausstempeln, Pause mit einem Klick
- **ArbZG-konform** — Pausen (≥30 min nach 6 h, ≥45 min nach 9 h), max. 10 h/Tag, 11 h Ruhe zwischen Schichten (§3, §4, §5 ArbZG)
- **Revisionssicher** — jeder Eintrag erzeugt einen Audit-Eintrag (wer, was, wann, alter + neuer Wert); keine harten Löschungen
- **Mitarbeiter-Verwaltung** — Einladen, Rollen (Admin/Manager/Mitarbeiter), Soll-Stunden, Deaktivieren
- **Anwesenheits-Board** — live sehen, wer gerade eingestempelt ist
- **Korrekturen** — Mitarbeiter stellen Korrekturanfragen, Manager genehmigen mit Audit-Trail
- **Urlaub & Krankmeldung** — Anträge, Genehmigungen, AU-Upload, Abwesenheits-Kalender
- **Projekte & Kunden** — optionale Zuordnung, Projekt-Reports
- **Feiertage** — automatisch nach Bundesland (16 Länder)
- **Exporte** — CSV (DSGVO Art. 20 Datenportabilität), persönlicher Datenexport
- **DSGVO** — EU-Server (Frankfurt), AVV-Vertrag, 2-jährige Aufbewahrung, Account-Löschung
- **PWA** — funktioniert im Handy-Browser, installierbar
- **Komplett auf Deutsch**

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **TailwindCSS** + **shadcn/ui**
- **Supabase** (PostgreSQL, Auth, RLS) — EU-Region Frankfurt
- **Stripe** (optional, für Abonnements)
- **Vitest** (Unit/Integration) · **Playwright** (E2E)

Architektur-Entscheidungen sind als ADRs in [`docs/decisions/`](docs/decisions) dokumentiert.

---

## Schnellstart (Entwicklung)

Voraussetzungen: Node.js 20+, Docker (für lokales Supabase).

```bash
make setup    # Abhängigkeiten installieren, .env aus .env.example anlegen, Dev-DB seeden
make dev      # Dev-Server starten (http://localhost:3000)
make test     # Alle Tests (Unit + Legal-Compliance)
make lint     # ESLint inkl. der eigenen Rechtskonformitäts-Regeln
make build    # Production-Build
```

Für End-to-End-Tests läuft eine isolierte Dev-Instanz:

```bash
npx playwright test
```

### Umgebungsvariablen

Siehe [`.env.example`](.env.example). Bis auf die Supabase-Zugangsdaten ist alles optional — Stripe etwa nur gesetzt, wenn Abrechnung aktiv sein soll.

---

## Rechtliche Konformität (zentral für dieses Projekt)

Dieses Produkt unterliegt deutschem Arbeitsrecht. Vor Änderungen an der Zeiterfassungs-Logik bitte [`docs/legal.md`](docs/legal.md) lesen.

**Unveränderliche Regeln** (teilweise als ESLint-Regeln in [`tools/eslint-rules/`](tools/eslint-rules) erzwungen):

- Alle Zeitstempel werden server-seitig erzeugt (`created_at`/`updated_at` via DB-Default) — nie dem Client vertraut (§16 ArbZG).
- Zeiteinträge werden nie hart gelöscht — immer Soft-Delete mit Grund (Revisionssicherheit).
- Jede Mutation an einem Zeiteintrag erzeugt einen Audit-Eintrag.
- Kein Backdating über den aktuellen Tag hinaus.
- Pausen-, Maximalstunden- und Ruhezeit-Regeln werden durchgesetzt (§3, §4, §5 ArbZG).

Die Rechtskonformität ist durch eigene Test-Suiten abgesichert: [`tests/legal/`](tests/legal) (ArbZG, Revisionssicherheit, DSGVO).

---

## Selbst-Hosting

Die Codebasis ist identisch zur gehosteten Version. Für ein lokales Setup:

```bash
git clone https://github.com/<your-org>/quoska.git
cd quoska
make setup   # .env aus .env.example, lokales Supabase via Docker
make dev
```

Für einen öffentlichen Server zusätzlich:

1. Eine eigene Supabase-Instanz (EU-Region) einrichten und die Migrations in [`supabase/migrations/`](supabase/migrations) anwenden.
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` setzen.
3. Optional Stripe (`STRIPE_SECRET_KEY`, `STRIPE_TEAM_PRICE_ID` / `STRIPE_BUSINESS_PRICE_ID` / `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`) für Abonnements — ohne diese Schlüssel läuft die App im Kostenlos-Tarif.

> **Hinweis zur Haftung:** Beim Selbst-Hosting tragen *Sie* die Verantwortung
> für ArbZG-/GoBD-/DSGVO-Konformität, EU-Hosting, AVV und Datensicherung. Genau
> diese Last abzunehmen ist der Wert des gehosteten Angebots.

---

## Lizenz

[GNU AGPL-3.0](LICENSE). Kurz: Sie dürfen Quoska nutzen, anpassen und selbst
hosten — wer Quoska aber als Dienst für Dritte betreibt, muss seine
Änderungen ebenfalls unter AGPL-3.0 offenlegen.

---

## Beitragen

Beiträge sind willkommen — siehe [CONTRIBUTING.md](CONTRIBUTING.md). Bitte beachten: Änderungen an der Zeiterfassungs-Logik müssen die Rechtskonformität (ArbZG/DSGVO) wahren und idealerweise von Tests begleitet sein.
