"use server";

import { pushConfigured, sendPush } from "@/lib/push";
import { requireUser } from "@/lib/supabase/server";

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireUser();
  if (!pushConfigured()) return { ok: false, message: "Faltan las claves de notificaciones en el servidor." };
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subs || subs.length === 0) return { ok: false, message: "Primero activa las notificaciones en este dispositivo." };
  const { sent } = await sendPush(supabase, subs, {
    title: "FitTracker",
    body: "Así se verán tus recordatorios. ¡A entrenar!",
    url: "/entrenar",
    tag: "test",
  });
  return sent > 0
    ? { ok: true, message: "Notificación enviada. Debería llegarte en unos segundos." }
    : { ok: false, message: "No se pudo enviar. Desactiva y vuelve a activar las notificaciones." };
}
