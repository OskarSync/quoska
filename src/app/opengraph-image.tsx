import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "Quoska — Zeiterfassung für deutsche KMU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamically generated OpenGraph / Twitter share image.
 * Branded, German, concrete (price + compliance), no emojis (Satori can't
 * reliably render them). Used automatically as og:image and twitter:image.
 */
export default function OpengraphImage() {
  const host = site.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0f172a",
          fontFamily: "sans-serif",
          color: "#ffffff",
          backgroundImage:
            "radial-gradient(circle at 90% 10%, rgba(124,58,237,0.35), transparent 45%)",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
              color: "white",
            }}
          >
            S
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Quoska</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Zeiterfassung, die vor dem Arbeitsschutz besteht.
          </div>
          <div style={{ fontSize: 30, color: "#cbd5e1" }}>
            ArbZG-konform · DSGVO · 39 € Flatrate · Server in Frankfurt
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 26,
            color: "#a5b4fc",
          }}
        >
          <div>Made in Germany</div>
          <div style={{ color: "#475569" }}>·</div>
          <div>{host}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
