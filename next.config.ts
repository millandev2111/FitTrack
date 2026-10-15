import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // dynamic: pantallas ya visitadas se reutilizan 30 s al volver a ellas.
    // static: las pestañas de abajo se precargan completas y se renuevan cada 60 s.
    // Guardar o editar datos llama a router.refresh(), que vacía esta caché.
    staleTimes: { dynamic: 30, static: 60 },
  },
  async headers() {
    return [
      {
        // El service worker siempre se revisa en la red para recibir actualizaciones.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
