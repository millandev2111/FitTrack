"use client";

/**
 * Pila de pantallas visitadas dentro de la app (solo en memoria).
 * Permite que "volver" regrese a la pantalla real de la que vienes y, si abriste
 * la página directamente (enlace, recarga), use un destino por defecto.
 */
const stack: string[] = [];
let replaceNext = false;
const REFRESH_KEY = "ft-refresh-on";

type Router = { back: () => void; push: (href: string) => void; replace: (href: string) => void; refresh: () => void };

/** Lo llama <NavHistory/> en cada cambio de ruta. */
export function recordVisit(path: string) {
  if (replaceNext) {
    replaceNext = false;
    if (stack.length) stack[stack.length - 1] = path;
    else stack.push(path);
    return;
  }
  if (stack[stack.length - 1] === path) return;
  if (stack[stack.length - 2] === path) stack.pop(); // fue un "atrás"
  else stack.push(path);
}

const pathOnly = (p: string | undefined) => p?.split("?")[0];

/** Llamar antes de router.replace / <Link replace> para no apilar la pantalla. */
export function willReplace() {
  replaceNext = true;
}

export function previousPath() {
  return stack.length >= 2 ? stack[stack.length - 2] : null;
}

/** Botón volver: pantalla anterior si existe; si no, el destino por defecto. */
export function goBack(router: Router, fallback: string) {
  if (previousPath()) router.back();
  else {
    willReplace();
    router.replace(fallback);
  }
}

/**
 * Después de guardar o eliminar: vuelve a la pantalla anterior (con datos frescos)
 * si es la esperada; si no, reemplaza la actual por el destino.
 */
export function leaveTo(router: Router, target: string) {
  const prev = previousPath();
  if (prev && (pathOnly(prev) === target || target === "back")) {
    try {
      sessionStorage.setItem(REFRESH_KEY, pathOnly(prev)!);
    } catch {}
    router.back();
  } else {
    willReplace();
    router.replace(target === "back" ? "/" : target);
    router.refresh();
  }
}

/** Si la pantalla a la que volvimos pidió refrescarse, lo hace una vez. */
export function consumeRefresh(pathname: string) {
  try {
    if (sessionStorage.getItem(REFRESH_KEY) === pathname) {
      sessionStorage.removeItem(REFRESH_KEY);
      return true;
    }
  } catch {}
  return false;
}
