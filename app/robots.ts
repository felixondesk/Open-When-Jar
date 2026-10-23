import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/auth"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
