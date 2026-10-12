import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open When Jar",
    short_name: "Open When",
    description: "A little jar of you, for someone you love.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff9fb",
    theme_color: "#773d69",
    icons: [
      { src: "/jar-illustration.png", sizes: "1200x1200", type: "image/png", purpose: "any" },
    ],
  };
}
