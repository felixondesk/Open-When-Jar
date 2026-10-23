import type { Metadata } from "next";
import { OpenWhenJarApp } from "@/components/OpenWhenJarApp";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": new URL("/#organization", siteUrl).href,
      name: "Open When Jar",
      url: siteUrl.href,
      logo: new URL("/open-when-jar-mark.png", siteUrl).href,
    },
    {
      "@type": "WebSite",
      "@id": new URL("/#website", siteUrl).href,
      name: "Open When Jar",
      url: siteUrl.href,
      publisher: { "@id": new URL("/#organization", siteUrl).href },
    },
    {
      "@type": "WebApplication",
      name: "Open When Jar",
      url: siteUrl.href,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      description: "Fill a personal Jar with letters, photos, and voice notes for someone to open when they need you.",
    },
  ],
};

export default function Home() {
  return (
    <>
      {/* CSP already allows inline scripts; JSON-LD is static so there is no injection surface. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <OpenWhenJarApp />
    </>
  );
}
