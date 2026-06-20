import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { HeroSection } from "@/components/marketing/sections/hero";
import { ProblemSection } from "@/components/marketing/sections/problem";
import { FeaturesSection } from "@/components/marketing/sections/features";
import { SavingsSection } from "@/components/marketing/sections/savings";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { PricingSection } from "@/components/marketing/sections/pricing";
import { FaqSection, FAQ } from "@/components/marketing/sections/faq";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";
import { site, legalInfo } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Quoska — Zeiterfassung für deutsche KMU (39 € Flatrate)",
  },
  description:
    "Gesetzlich vorgeschriebene Zeiterfassung für dein Team: Pausen nach §4 ArbZG, revisionssicherer Audit-Trail, DSGVO-konform in Frankfurt gehostet. 39 € im Monat — egal wie viele Mitarbeiter.",
  alternates: { canonical: "/" },
  category: "Business & Industrial",
  openGraph: {
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "ArbZG-konforme Zeiterfassung als Flatrate. 39 €/Monat für das ganze Team. Server in Frankfurt, AVV inklusive.",
    locale: "de_DE",
    type: "website",
    siteName: "Quoska",
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "ArbZG-konforme Zeiterfassung als Flatrate. 39 €/Monat für das ganze Team. Server in Frankfurt.",
  },
};

/** Structured data for rich results: Organization + WebSite + SoftwareApplication + FAQPage. */
const orgEmail = legalInfo.email.includes("[TODO:") ? undefined : legalInfo.email;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icons/icon-512.png`,
      ...(orgEmail ? { email: orgEmail } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: "de-DE",
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      url: site.url,
      description:
        "ArbZG-konforme Zeiterfassung für deutsche KMU. Flatrate statt Pro-Kopf-Preis.",
      publisher: { "@id": `${site.url}/#organization` },
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
        { "@type": "Offer", name: "Team", price: "39", priceCurrency: "EUR" },
      ],
    },
    {
      "@type": "FAQPage",
      url: `${site.url}/#faq`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />

      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <SavingsSection />
        <HowItWorksSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
