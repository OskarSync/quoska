import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieBanner } from "@/components/marketing/cookie-banner";
import { site } from "@/lib/site";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Quoska — Zeiterfassung für deutsche KMU",
    template: "%s | Quoska",
  },
  description:
    "Gesetzlich vorgeschriebene Zeiterfassung für dein Team: Pausen nach §4 ArbZG, revisionssicherer Audit-Trail, DSGVO-konform in Frankfurt gehostet. 39 € Flatrate — egal wie viele Mitarbeiter.",
  applicationName: site.name,
  manifest: "/manifest.json",
  keywords: [
    "Zeiterfassung",
    "Arbeitszeiterfassung",
    "ArbZG",
    "Stempeluhr",
    "Zeiterfassung Software",
    "KMU",
    "DSGVO",
    "Pausenerfassung",
    "Deutschland",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: site.url,
    siteName: site.name,
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "ArbZG-konforme Zeiterfassung als Flatrate. 39 €/Monat für das ganze Team.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "ArbZG-konforme Zeiterfassung als Flatrate. 39 €/Monat für das ganze Team.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="de" className={cn("h-full antialiased", "font-sans", inter.variable)}>
      <head>
        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        {/* DSGVO-honest cookie banner (no tracking). Mounted once globally. */}
        <CookieBanner />
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
