/** Normaliza para buscar sin tildes ni mayúsculas. */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const dateFmt = (opts: Intl.DateTimeFormatOptions, timeZone?: string) =>
  new Intl.DateTimeFormat("es-CO", { ...opts, timeZone });

export function formatDay(iso: string, timeZone?: string) {
  return dateFmt({ weekday: "short", day: "numeric", month: "short" }, timeZone).format(new Date(iso)).replace(/\./g, "");
}

export function formatDate(iso: string, timeZone?: string) {
  return dateFmt({ day: "numeric", month: "short", year: "numeric" }, timeZone).format(new Date(iso)).replace(/\./g, "");
}

export function formatShortDate(iso: string, timeZone?: string) {
  return dateFmt({ day: "numeric", month: "short" }, timeZone).format(new Date(iso)).replace(/\./g, "");
}

export function formatTime(iso: string, timeZone?: string) {
  return dateFmt({ hour: "numeric", minute: "2-digit" }, timeZone).format(new Date(iso));
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function relativeDay(iso: string, timeZone?: string) {
  const fmt = (d: Date) => dateFmt({ year: "numeric", month: "2-digit", day: "2-digit" }, timeZone).format(d);
  const today = fmt(new Date());
  const yesterday = fmt(new Date(Date.now() - 86_400_000));
  const day = fmt(new Date(iso));
  if (day === today) return "hoy";
  if (day === yesterday) return "ayer";
  return formatShortDate(iso, timeZone);
}
