import { ChevronRight, Clock, Dumbbell, Flame, Route, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SPORT_BY_KEY, type SportKey } from "@/lib/sports";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { formatDay, formatMinutes } from "@/lib/text";
import type { Unit } from "@/lib/types";
import { formatNumber, formatVolume } from "@/lib/units";

export const metadata: Metadata = { title: "Historial" };

type WorkoutRow = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string;
  workout_exercises: { id: string; sets: { volume_kg: number; set_type: string; personal_records: { id: string }[] }[] }[];
};
type ActivityRow = { id: string; sport: SportKey; started_at: string; duration_minutes: number; distance_km: number | null; calories: number | null; details: Record<string, string | number> };
type Item = { kind: "workout"; at: string; w: WorkoutRow } | { kind: "activity"; at: string; a: ActivityRow };

function activityHighlight(a: ActivityRow) {
  const d = a.details ?? {};
  if (a.sport === "soccer" && (d.goals || d.assists)) return `${d.goals ?? 0} goles · ${d.assists ?? 0} asist.`;
  if (a.sport === "basketball" && d.points) return `${d.points} puntos`;
  if (typeof d.result === "string" && d.result) return d.result;
  return null;
}

export default async function HistoryPage() {
  const { supabase } = await requireUser();
  const [{ data }, activitiesRes, profileRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, name, started_at, ended_at, workout_exercises(id, sets(volume_kg, set_type, personal_records(id)))")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(60),
    supabase.from("activities").select("id, sport, started_at, duration_minutes, distance_km, calories, details").order("started_at", { ascending: false }).limit(60),
    getProfile().then((data) => ({ data })),
  ]);
  const unit = (profileRes.data?.unit_system ?? "kg") as Unit;
  const tz = profileRes.data?.timezone ?? "America/Bogota";

  const items: Item[] = [
    ...((data ?? []) as unknown as WorkoutRow[]).map((w) => ({ kind: "workout" as const, at: w.started_at, w })),
    ...((activitiesRes.data ?? []) as ActivityRow[]).map((a) => ({ kind: "activity" as const, at: a.started_at, a })),
  ].sort((x, y) => Date.parse(y.at) - Date.parse(x.at));

  const monthFmt = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: tz });
  const groups = new Map<string, Item[]>();
  items.forEach((it) => {
    const key = monthFmt.format(new Date(it.at));
    groups.set(key, [...(groups.get(key) ?? []), it]);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[26px] font-bold tracking-tight">Historial</h1>
        <Link href="/deportes/nuevo" className="btn btn-ghost h-10 rounded-[14px] px-3.5 text-sm">
          <Flame size={17} className="text-warm" /> Deporte
        </Link>
      </div>
      {items.length === 0 && (
        <div className="card px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">Tu primer entrenamiento aparecerá aquí</p>
          <p className="mt-1 text-sm text-sub">Toca el botón + para empezar.</p>
        </div>
      )}
      {[...groups.entries()].map(([month, list]) => (
        <section key={month} className="flex flex-col gap-2.5">
          <h2 className="text-xs font-bold tracking-[.1em] text-sub uppercase">{month}</h2>
          {list.map((it) => {
            if (it.kind === "activity") {
              const a = it.a;
              const sport = SPORT_BY_KEY[a.sport] ?? SPORT_BY_KEY.other;
              const highlight = activityHighlight(a);
              return (
                <Link key={a.id} href={`/deportes/${a.id}`} className="card flex items-center gap-3 p-3.5">
                  <span className="grad-warm grid size-11 flex-none place-items-center rounded-[14px]">
                    <sport.Icon size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px]">{sport.label}</b>
                    <small className="block text-xs text-sub capitalize">{formatDay(a.started_at, tz)}</small>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-sub">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {formatMinutes(a.duration_minutes * 60000)}
                      </span>
                      {a.distance_km != null && Number(a.distance_km) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Route size={12} /> {formatNumber(Number(a.distance_km), 2)} km
                        </span>
                      )}
                      {a.calories != null && <span>{formatNumber(a.calories, 0)} kcal</span>}
                    </span>
                  </span>
                  {highlight && <span className="chip bg-warm/15 text-warm">{highlight}</span>}
                  <ChevronRight size={18} className="flex-none text-sub" />
                </Link>
              );
            }
            const w = it.w;
            const sets = w.workout_exercises.flatMap((e) => e.sets.filter((s) => s.set_type !== "warmup"));
            const volume = sets.reduce((sum, s) => sum + Number(s.volume_kg || 0), 0);
            const prCount = w.workout_exercises.flatMap((e) => e.sets).filter((s) => s.personal_records.length > 0).length;
            return (
              <Link key={w.id} href={`/historial/${w.id}`} className="card flex items-center gap-3 p-3.5">
                <span className="grad grid size-11 flex-none place-items-center rounded-[14px]">
                  <Dumbbell size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px]">{w.name}</b>
                  <small className="block text-xs text-sub capitalize">{formatDay(w.started_at, tz)}</small>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-sub">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {formatMinutes(Date.parse(w.ended_at) - Date.parse(w.started_at))}
                    </span>
                    <span>
                      {w.workout_exercises.length} ejercicios · {sets.length} series
                    </span>
                    {volume > 0 && <span>{formatVolume(volume, unit)}</span>}
                  </span>
                </span>
                {prCount > 0 && (
                  <span className="chip bg-gold/15 text-gold">
                    <Trophy size={12} /> {prCount}
                  </span>
                )}
                <ChevronRight size={18} className="flex-none text-sub" />
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
