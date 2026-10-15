"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install";

// Se captura lo antes posible: Chrome dispara este evento una sola vez al cargar.
captureInstallPrompt();

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo el service worker no guarda caché (?dev=1), pero sí recibe notificaciones.
    const url = process.env.NODE_ENV === "development" ? "/sw.js?dev=1" : "/sw.js";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
