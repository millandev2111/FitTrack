import { NextResponse, type NextRequest } from "next/server";
import { localDate } from "@/lib/progress";
import { pushConfigured, sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

// La llama Supabase (pg_cron + pg_net) cada 15 minutos. Envía los recordatorios que tocan.
const WINDOW_MIN = 30;

type Reminder = {
  id: string;
  user_id: string;
  weekdays: number[];
  time_of_day: string;
  message: string | null;
  last_sent_at: string | null;
  routine: { name: string } | null;
};

function nowIn(tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dow, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SECRET_KEY en el servidor" }, { status: 500 });
  if (!pushConfigured()) return NextResponse.json({ error: "Faltan las claves VAPID en el servidor" }, { status: 500 });

  const { data: reminders, error } = await admin
    .from("reminders")
    .select("id, user_id, weekdays, time_of_day, message, last_sent_at, routine:routines(name)")
    .eq("enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = (reminders ?? []) as unknown as Reminder[];
  if (list.length === 0) return NextResponse.json({ checked: 0, sent: 0 });

  const userIds = [...new Set(list.map((r) => r.user_id))];
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("id, timezone").in("id", userIds),
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
  ]);
  const tzOf = new Map((profiles ?? []).map((p) => [p.id, p.timezone as string]));

  let sent = 0;
  for (const r of list) {
    const tz = tzOf.get(r.user_id) ?? "America/Bogota";
    const { dow, minutes } = nowIn(tz);
    const [h, m] = r.time_of_day.split(":").map(Number);
    const target = h * 60 + m;
    const today = localDate(new Date(), tz);
    const alreadySent = r.last_sent_at && localDate(new Date(r.last_sent_at), tz) === today;
    if (!r.weekdays.includes(dow) || minutes < target || minutes - target >= WINDOW_MIN || alreadySent) continue;

    const mine = (subs ?? []).filter((s) => s.user_id === r.user_id);
    if (mine.length === 0) continue;
    const body = r.message?.trim() || (r.routine ? `Hoy toca ${r.routine.name}. Toca para empezar.` : "Tu sesión te espera. Toca para empezar.");
    const result = await sendPush(admin, mine, { title: "Hora de entrenar", body, url: "/entrenar", tag: `reminder-${r.id}` });
    sent += result.sent;
    await admin.from("reminders").update({ last_sent_at: new Date().toISOString() }).eq("id", r.id);
  }

  return NextResponse.json({ checked: list.length, sent });
}

export const POST = run;
export const GET = run;
