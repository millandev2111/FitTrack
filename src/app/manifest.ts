import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FitTracker",
    short_name: "FitTracker",
    description: "Registra tus entrenos, rompe tus marcas y mira cómo avanzas.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090b14",
    theme_color: "#090b14",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Entrenar", short_name: "Entrenar", url: "/entrenar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Historial", short_name: "Historial", url: "/historial", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
