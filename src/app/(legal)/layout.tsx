import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

/**
 * Shared layout for all legal pages. Same nav/footer as the marketing site,
 * simpler nav (logo + back). Content is centered for readability.
 */
export default function LegalLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <MarketingNav variant="legal" />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
          {children}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
