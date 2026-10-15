"use client";

/**
 * Instalación de la PWA.
 * Android/Chrome/Edge disparan `beforeinstallprompt` (una sola vez y temprano), así que
 * lo guardamos al cargar la app para mostrar nuestro propio botón "Instalar".
 * iOS no tiene ese evento: allí se instala desde Compartir → Añadir a pantalla de inicio.
 */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function captureInstallPrompt() {
  if (typeof window === "undefined" || (window as { __ftInstall?: boolean }).__ftInstall) return;
  (window as { __ftInstall?: boolean }).__ftInstall = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export type InstallState = "installed" | "prompt" | "ios" | "android-manual" | "desktop-manual";

export function installState(): InstallState {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/android/i.test(ua)) return "android-manual";
  return "desktop-manual";
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

export function onInstallChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
