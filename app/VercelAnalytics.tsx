"use client";

import { Analytics } from "@vercel/analytics/next";

// Query strings can carry auth codes and checkout IDs; admin pages are not product traffic.
export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    if (url.pathname.startsWith("/admin")) return null;
    url.search = "";
    return { ...event, url: url.toString() };
  }} />;
}
