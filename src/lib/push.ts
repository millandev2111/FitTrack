import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

let configured = false;
export function pushConfigured() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://fittracker.vercel.app", pub, priv);
    configured = true;
  }
  return true;
}

/** Envía a cada suscripción y borra las que el navegador ya dio de baja (404/410). */
export async function sendPush(supabase: SupabaseClient, subs: Sub[], payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, failed: subs.length };
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "normal" });
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent, failed };
}
