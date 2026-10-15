/* FitTracker service worker
 * - Archivos estáticos (_next/static, iconos): primero caché.
 * - Páginas: primero red; sin conexión, la última copia guardada.
 * - /sesion se guarda una sola vez y sirve para cualquier ?id= (la sesión vive en el teléfono).
 * - Notificaciones push de los recordatorios.
 * - En desarrollo (registrado como /sw.js?dev=1) no guarda nada en caché.
 */
const VERSION = "ft-v5";
const DEV = new URL(self.location.href).searchParams.has("dev");
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png"];
const WARM_PAGES = ["/sesion", "/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (DEV) return self.skipWaiting();
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      // Guarda la pantalla de sesión para poder entrenar sin conexión.
      const pages = await caches.open(PAGE_CACHE);
      await Promise.all(
        WARM_PAGES.map(async (path) => {
          try {
            const res = await fetch(path, { credentials: "same-origin" });
            if (res.ok && !res.redirected) await pages.put(path, res);
          } catch {}
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/exercises/") || url.pathname === "/manifest.webmanifest";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (DEV || req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/auth") || url.pathname === "/sw.js") return;

  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) (await caches.open(STATIC_CACHE)).put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  if (req.mode === "navigate") {
    // La sesión se guarda sin ?id= para reutilizarla con cualquier sesión.
    const key = url.pathname === "/sesion" ? "/sesion" : url.pathname;
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && res.type === "basic") {
            (await caches.open(PAGE_CACHE)).put(key, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(key, { ignoreSearch: true });
          return cached || (await caches.match("/offline.html")) || Response.error();
        }
      })(),
    );
  }
});

// ----- Notificaciones -----
self.addEventListener("push", (event) => {
  let data = { title: "FitTracker", body: "Hora de entrenar.", url: "/entrenar" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/entrenar" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
