"use client";

import { BellOff, BellRing, LoaderCircle, Plus, Send, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { BackButton } from "@/components/back-button";
import { useProfile } from "@/components/profile-provider";
import { createClient } from "@/lib/supabase/client";
import { sendTestPush } from "./actions";

export type Reminder = { id: string; weekdays: number[]; time_of_day: string; message: string | null; enabled: boolean; routine_id: string | null };
type Support = "loading" | "ok" | "ios-install" | "unsupported" | "denied";

// Lunes primero; valores como JavaScript (0 = domingo).
const DAYS = [
  { v: 1, l: "Lu", name: "Lunes" },
  { v: 2, l: "Ma", name: "Martes" },
  { v: 3, l: "Mi", name: "Miércoles" },
  { v: 4, l: "Ju", name: "Jueves" },
  { v: 5, l: "Vi", name: "Viernes" },
  { v: 6, l: "Sá", name: "Sábado" },
  { v: 0, l: "Do", name: "Domingo" },
];

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Traduce los errores del navegador a algo accionable. */
function pushErrorMessage(e: unknown) {
  const err = e as { name?: string; message?: string };
  if (err?.name === "AbortError" || /push service|registration failed/i.test(err?.message ?? "")) {
    const brave = (navigator as { brave?: unknown }).brave;
    return brave
      ? "Brave trae las notificaciones apagadas. Actívalas en brave://settings/privacy → «Usar los servicios de Google para mensajes push», reinicia Brave y vuelve a intentar."
      : "Este navegador no tiene servicio de notificaciones (pasa en navegadores integrados y en algunos basados en Chromium). Abre la app en Google Chrome, Edge, Firefox o Safari.";
  }
  if (err?.name === "NotAllowedError") return "Necesitas permitir las notificaciones para FitTracker en los ajustes del navegador.";
  return err?.message && !/^[A-Z][a-z]+Error/.test(err.message) ? err.message : "No se pudieron activar las notificaciones. Inténtalo de nuevo.";
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) await navigator.serviceWorker.register(process.env.NODE_ENV === "development" ? "/sw.js?dev=1" : "/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export function RemindersClient({ initial, routines }: { initial: Reminder[]; routines: { id: string; name: string }[] }) {
  const profile = useProfile();
  const [support, setSupport] = useState<Support>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>(initial);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, startTest] = useTransition();

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios && !standalone) return setSupport("ios-install");
    if (!supported) return setSupport("unsupported");
    if (Notification.permission === "denied") return setSupport("denied");
    setSupport("ok");
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Faltan las claves de notificaciones.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupport(permission === "denied" ? "denied" : "ok");
        throw new Error("Necesitas permitir las notificaciones.");
      }
      const reg = await registration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
      const json = sub.toJSON();
      const { error } = await createClient()
        .from("push_subscriptions")
        .upsert({ user_id: profile.id, endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) }, { onConflict: "endpoint" });
      if (error) throw new Error("No se pudo guardar el dispositivo. Revisa tu conexión.");
      setSubscribed(true);
      setNotice({ ok: true, text: "Notificaciones activadas en este dispositivo." });
    } catch (e) {
      setNotice({ ok: false, text: pushErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setNotice({ ok: true, text: "Notificaciones desactivadas en este dispositivo." });
    } finally {
      setBusy(false);
    }
  };

  const save = async (r: Reminder) => {
    setReminders((list) => list.map((x) => (x.id === r.id ? r : x)));
    const { error } = await createClient()
      .from("reminders")
      .upsert({ id: r.id, user_id: profile.id, weekdays: r.weekdays, time_of_day: r.time_of_day, message: r.message, enabled: r.enabled, routine_id: r.routine_id, last_sent_at: null });
    if (error) setNotice({ ok: false, text: r.weekdays.length === 0 ? "Elige al menos un día." : "No se pudo guardar el recordatorio. Revisa tu conexión." });
  };

  const add = async () => {
    const r: Reminder = { id: crypto.randomUUID(), weekdays: [1, 3, 5], time_of_day: "18:00", message: null, enabled: true, routine_id: null };
    setReminders((list) => [...list, r]);
    await save(r);
  };

  const remove = async (id: string) => {
    setReminders((list) => list.filter((x) => x.id !== id));
    await createClient().from("reminders").delete().eq("id", id);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <BackButton fallback="/perfil" />
        <h1 className="font-display text-[26px] font-bold tracking-tight">Recordatorios</h1>
      </div>

      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className={`grid size-11 flex-none place-items-center rounded-[14px] ${subscribed ? "grad" : "bg-surface-2 text-sub"}`}>
            {subscribed ? <BellRing size={20} /> : <BellOff size={20} />}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[15px]">{subscribed ? "Notificaciones activadas" : "Notificaciones en este dispositivo"}</b>
            <small className="text-[12px] leading-snug text-sub">
              {support === "ios-install" && "En iPhone, primero instala la app: en Safari toca Compartir → Añadir a pantalla de inicio, y ábrela desde el ícono."}
              {support === "unsupported" && "Este navegador no permite notificaciones de páginas web."}
              {support === "denied" && "Bloqueaste las notificaciones. Actívalas en los ajustes del navegador o del teléfono para FitTracker."}
              {support === "ok" && (subscribed ? "Te llegarán los recordatorios que configures abajo." : "Actívalas para recibir tus recordatorios de entrenamiento.")}
              {support === "loading" && "Revisando…"}
            </small>
          </span>
        </div>
        {support === "ok" && (
          <div className="flex gap-2">
            {subscribed ? (
              <>
                <button onClick={() => startTest(async () => { const r = await sendTestPush(); setNotice({ ok: r.ok, text: r.message }); })} disabled={testing} className="btn grad flex-1">
                  {testing ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={17} />} Probar
                </button>
                <button onClick={disable} disabled={busy} className="btn btn-ghost flex-1">
                  Desactivar
                </button>
              </>
            ) : (
              <button onClick={enable} disabled={busy} className="btn grad w-full">
                {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Smartphone size={17} />} Activar en este dispositivo
              </button>
            )}
          </div>
        )}
        {notice && <p className={`rounded-2xl px-3 py-2 text-[13px] ${notice.ok ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{notice.text}</p>}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-[15px] font-semibold">Cuándo avisarte</h2>
        {reminders.map((r) => (
          <div key={r.id} className={`card flex flex-col gap-3 p-3.5 ${r.enabled ? "" : "opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <input
                type="time"
                value={r.time_of_day.slice(0, 5)}
                onChange={(e) => e.target.value && save({ ...r, time_of_day: e.target.value })}
                aria-label="Hora del recordatorio"
                className="num bg-transparent text-[26px] font-bold outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label="Recordatorio activo"
                  onClick={() => save({ ...r, enabled: !r.enabled })}
                  className={`relative h-7 w-12 rounded-full transition-colors ${r.enabled ? "bg-a1" : "bg-surface-2"}`}
                >
                  <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${r.enabled ? "left-6" : "left-1"}`} />
                </button>
                <button onClick={() => remove(r.id)} className="grid size-8 place-items-center rounded-lg bg-down/12 text-down" aria-label="Eliminar recordatorio">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="flex justify-between gap-1" role="group" aria-label="Días">
              {DAYS.map((d) => {
                const on = r.weekdays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    aria-pressed={on}
                    aria-label={d.name}
                    onClick={() => {
                      const weekdays = on ? r.weekdays.filter((x) => x !== d.v) : [...r.weekdays, d.v];
                      if (weekdays.length) save({ ...r, weekdays });
                    }}
                    className={`grid size-9 place-items-center rounded-xl text-[13px] font-bold ${on ? "grad" : "bg-surface-2 text-sub"}`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-2xl border border-line bg-surface px-3 py-2">
                <span className="block text-[10.5px] font-semibold text-sub">Rutina (opcional)</span>
                <select value={r.routine_id ?? ""} onChange={(e) => save({ ...r, routine_id: e.target.value || null })} className="w-full appearance-none bg-transparent text-[13.5px] font-bold outline-none">
                  <option value="">Ninguna</option>
                  {routines.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-2xl border border-line bg-surface px-3 py-2">
                <span className="block text-[10.5px] font-semibold text-sub">Mensaje (opcional)</span>
                <input
                  defaultValue={r.message ?? ""}
                  onBlur={(e) => (e.target.value.trim() || null) !== r.message && save({ ...r, message: e.target.value.trim() || null })}
                  maxLength={120}
                  placeholder="A darle duro"
                  className="w-full bg-transparent text-[13.5px] font-bold outline-none"
                />
              </label>
            </div>
          </div>
        ))}
        <button onClick={add} className="btn btn-ghost w-full">
          <Plus size={18} /> Añadir recordatorio
        </button>
        <p className="text-[11.5px] leading-snug text-sub">
          Los recordatorios automáticos empiezan a llegar cuando la app esté publicada y configures el envío en Supabase (está en la guía). El botón Probar funciona desde ya.
        </p>
      </section>
    </div>
  );
}
