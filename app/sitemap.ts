import type { MetadataRoute } from "next";
import { SUBNETS_REAL } from "@/lib/data/subnets-real";

/**
 * Dynamic sitemap covering static routes + every tracked subnet detail page.
 * The subnet list comes from SUBNETS_REAL so it scales as we add coverage.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://tyvera.ai";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/dashboard`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/subnets`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${baseUrl}/validators`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${baseUrl}/yield`, lastModified: now, changeFrequency: "hourly", priority: 0.85 },
    { url: `${baseUrl}/recommendations`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/portfolio`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/activity`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/chat`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/backtest`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/holders`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/metrics`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/alerts`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/developers`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/tax`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/risk-disclosure`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // One URL per tracked subnet. `hourly` change frequency reflects live data,
  // and priority sits just below /subnets because the index is the canonical
  // entry point for search users.
  const subnetRoutes: MetadataRoute.Sitemap = SUBNETS_REAL.map((s) => ({
    url: `${baseUrl}/subnets/${s.netuid}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...subnetRoutes];
}
