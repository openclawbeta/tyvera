import type { MetadataRoute } from "next";

/**
 * Robots directives.
 *
 * - Allow marketing + subnet detail routes (primary SEO surfaces).
 * - Disallow /api/ (not useful to index, can leak rate budget).
 * - Disallow /admin and private account pages (dashboard, portfolio,
 *   alerts, settings, billing, tax) — these require a wallet and serve
 *   no value in SERPs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/subnets",
          "/subnets/",
          "/recommendations",
          "/validators",
          "/yield",
          "/metrics",
          "/holders",
          "/chat",
          "/backtest",
          "/developers",
          "/pricing",
          "/privacy",
          "/terms",
          "/risk-disclosure",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/portfolio",
          "/alerts",
          "/settings",
          "/billing",
          "/tax",
          "/activity",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: "https://tyvera.ai/sitemap.xml",
    host: "https://tyvera.ai",
  };
}
