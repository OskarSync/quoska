import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots.txt — allow public marketing + legal pages, keep the authenticated app,
 * the API, and the setup wizard out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/setup"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
