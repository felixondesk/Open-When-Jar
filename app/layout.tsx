import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/fraunces/600.css";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Open When Jar — Make moments count",
  description: "Fill a personal Jar with your words, photos, and voice for someone to open when they need you.",
  applicationName: "Open When Jar",
  robots: { index: true, follow: true },
  icons: { icon: "/open-when-jar-mark.png", apple: "/open-when-jar-mark.png" },
  openGraph: {
    type: "website",
    siteName: "Open When Jar",
    title: "Open When Jar — Make moments count",
    description: "Fill a personal Jar with your words, photos, and voice for someone to open when they need you.",
    images: [{ url: "/open-when-jar-mark.png", width: 1254, height: 1254, alt: "Open When Jar" }],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff9fb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
