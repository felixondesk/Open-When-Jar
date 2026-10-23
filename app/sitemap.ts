import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", siteUrl).href, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/terms", siteUrl).href, changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/privacy", siteUrl).href, changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/refund-policy", siteUrl).href, changeFrequency: "yearly", priority: 0.3 },
  ];
}
