// Single source for absolute public URLs (metadata, robots, sitemap).
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3127");
