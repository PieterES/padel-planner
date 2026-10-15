import type { MetadataRoute } from "next";

/** Makes the site installable ("Add to home screen" / Chrome "Install app"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padel Planner",
    short_name: "Padel",
    description: "Find padel matches at Peakz when enough friends are free.",
    start_url: "/matches",
    scope: "/",
    display: "standalone",
    background_color: "#0b1f3a",
    theme_color: "#0b1f3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
