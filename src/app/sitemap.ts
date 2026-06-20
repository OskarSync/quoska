import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { legalStandIso } from "@/config/server/site-meta";

/**
 * sitemap.xml — public, indexable routes only.
 * App/api/setup routes are disallowed in robots.ts and intentionally excluded here.
 * `lastModified` is computed server-side (see site-meta) so no client Date is used.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = legalStandIso;
  const base = site.url;

  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/agb`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${base}/datenschutz`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${base}/impressum`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/widerruf`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
