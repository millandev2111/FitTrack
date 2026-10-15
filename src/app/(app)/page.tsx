import { Check, ChevronRight, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { PR_LABEL } from "@/lib/labels";
import { monthLabel, shiftMonth } from "@/lib/month-summary";
import { computeStreak, localDate } from "@/lib/progress";
import { fetchRoutines } from "@/lib/routines";
import { requireUser } from "@/lib/supabase/server";
import { relativeDay } from "@/lib/text";
import type { PrType, Profile } from "@/lib/types";
import { formatNumber, formatWeight } from "@/lib/units";
import { InstallBanner } from "@/components/install-app";
import { ActiveBanner, TodayCard } from "./home-client";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HomePage() {
  const { supabase, userId } = await requireUser();
  const { data: profileData } = await supabase.from("profiles").select("display_name, avatar_url, unit_system, weekly_goal, timezone").eq("id", userId).maybeSingle();
  const profile = (profileData ?? { display_name: null, avatar_url: null, unit_system: "kg", weekly_goal: 4, timezone: "America/Bogota" }) as Pick<
    Profile,
    "display_name" | "avatar_url" | "unit_system" | "weekly_goal" | "timezone"
  >;
  const tz = profile.timezone;
  const now = new Date();
  const today = localDate(now, tz);
  const since = localDate(new Date(now.getTime() - 180 * 86_400_000), tz);
  const monthStart = `${today.slice(0, 8)}01`;

  const [daysRes, prsRes, prCountRes, routines, lastRes, openRes] = await Promise.all([
    supabase.from("training_days").select("day, kind").gte("day", since),
    supabase
      .from("personal_records")
      .select("id, type, value, weight_kg, reps, achieved_at, exercise:exercises(id, slug, name)")
      .order("achieved_at", { ascending: false })
      .limit(12),
    supabase.from("personal_records").select("set_id").gte("achieved_at", `${monthStart}T00:00:00`).limit(1000),
    fetchRoutines(supabase),
    supabase.from("workouts").select("routine_id").not("routine_id", "is", null).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("workouts").select("id").is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const days = (daysRes.data ?? []) as { day: string; kind: "gym" | "sport" }[];
  const streak = computeStreak(days.map((d) => d.day), today);

  // Semana actual (lunes a domingo)
  const todayDate = new Date(`${today}T12:00:00Z`);
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const week = WEEKDAYS.map((label, i) => {
    const d = new Date(todayDate.getTime() + (i - mondayOffset) * 86_400_000).toISOString().slice(0, 10);
    const kinds = days.filter((x) => x.day === d).map((x) => x.kind);
    return { label, date: d, gym: kinds.includes("gym"), sport: kinds.includes("sport"), isToday: d === today, future: d > today };
  });
  const trainedThisWeek = week.filter((d) => d.gym || d.sport).length;

  // La rutina que sigue después de la última que hiciste
  const lastIdx = routines.findIndex((r) => r.id === lastRes.data?.routine_id);
  const nextRoutine = routines.length ? routines[(lastIdx + 1) % routines.length] : null;

  // Un récord por ejercicio (el más reciente)
  type PrRow = { id: string; type: PrType; value: number; weight_kg: number | null; reps: number | null; achieved_at: string; exercise: { id: string; name: string } | null };
  const seen = new Set<string>();
  const recentPrs = ((prsRes.data ?? []) as unknown as PrRow[])
    .filter((p) => p.exercise && !seen.has(p.exercise.id) && seen.add(p.exercise.id))
    .slice(0, 3);

  const name = profile.display_name?.split(" ")[0] ?? "atleta";
  const initials = (profile.display_name ?? "FT")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now));

  return (
    <div className="relative flex flex-col gap-3.5">
      <div className="glow" />
      <header className="relative flex items-center justify-between">
        <Link href="/perfil" className="flex items-center gap-2.5">
          {profile.avatar_url ? (
             
            <img src={profile.avatar_url} alt="" className="size-[42px] rounded-[15px] object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grad grid size-[42px] place-items-center rounded-[15px] font-display text-sm font-bold">{initials}</span>
          )}
          <span>
            <small className="block text-xs text-sub">{greeting(hour % 24)}</small>
            <b className="font-display text-[17px] font-semibold">{name}</b>
          </span>
        </Link>
      </header>

      <div className="relative">
        <ActiveBanner openWorkoutId={openRes.data?.id ?? null} />
      </div>

      <div className="relative empty:hidden">
        <InstallBanner />
      </div>

      <section className="card relative p-3.5" aria-label="Esta semana">
        <div className="flex items-center justify-between">
          <b className="font-display text-sm font-semibold">Esta semana</b>
          <span className="text-xs text-sub">
            <b className="text-fg">{trainedThisWeek}</b> de {profile.weekly_goal} días
          </span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className={`text-[10.5px] font-semibold ${d.isToday ? "text-a1" : "text-sub"}`}>{d.label}</span>
              <span
                className={`grid size-8 place-items-center rounded-[11px] ${
                  d.gym ? "grad" : d.sport ? "bg-warm/20 text-warm" : d.isToday ? "border-2 border-dashed border-a1/80 text-a1" : "bg-surface-2"
                }`}
                aria-label={`${d.label}: ${d.gym ? "gimnasio" : d.sport ? "deporte" : d.future ? "pendiente" : "descanso"}`}
              >
                {(d.gym || d.sport) && <Check size={16} strokeWidth={3} />}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="relative grid grid-cols-2 gap-2.5">
        <div className="card flex flex-col gap-0.5 p-3.5">
          <Flame size={22} className="mb-1.5 text-warm" fill="currentColor" />
          <b className="num text-2xl font-bold tracking-tight">{streak}</b>
          <small className="text-[11.5px] text-sub">{streak === 1 ? "día de racha" : "días de racha"}</small>
        </div>
        <div className="card flex flex-col gap-0.5 p-3.5">
          <Trophy size={22} className="mb-1.5 text-gold" fill="currentColor" />
          <b className="num text-2xl font-bold tracking-tight">{new Set((prCountRes.data ?? []).map((r) => r.set_id)).size}</b>
          <small className="text-[11.5px] text-sub">récords este mes</small>
        </div>
      </div>

      <div className="relative">
        <TodayCard routine={nextRoutine} hasActive={Boolean(openRes.data)} />
      </div>

      {Number(today.slice(8, 10)) <= 7 && (
        <Link href={`/resumen/${shiftMonth(today.slice(0, 7), -1)}`} className="card relative flex items-center gap-3 p-3.5">
          <span className="grad grid size-11 flex-none place-items-center rounded-[14px]">
            <Sparkles size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[15px]">Tu resumen de {monthLabel(shiftMonth(today.slice(0, 7), -1))} está listo</b>
            <small className="text-xs text-sub">Días, volumen, récords y tu mayor salto</small>
          </span>
          <ChevronRight size={20} className="text-sub" />
        </Link>
      )}

      <section className="relative flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold">Últimos récords</h2>
          <Link href="/progreso" className="text-xs text-sub">
            Ver progreso
          </Link>
        </div>
        {recentPrs.length === 0 ? (
          <div className="card p-4 text-sm text-sub">
            Cuando superes una marca anterior en cualquier ejercicio, aparecerá aquí.
          </div>
        ) : (
          <ul className="card flex flex-col px-3.5 py-1">
            {recentPrs.map((p) => (
              <li key={p.id}>
                <Link href={`/ejercicios/${p.exercise!.id}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <span className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-gold/15 text-gold">
                    <Trophy size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px]">{p.exercise!.name}</b>
                    <small className="text-[11.5px] text-sub">
                      {PR_LABEL[p.type]} · {relativeDay(p.achieved_at, tz)}
                    </small>
                  </span>
                  <span className="chip chip-up">
                    {p.type === "reps" ? `${formatNumber(p.value, 0)} reps` : formatWeight(p.value, profile.unit_system)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
