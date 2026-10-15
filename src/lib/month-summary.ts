import type { SupabaseClient } from "@supabase/supabase-js";
import { MUSCLE_FAMILY } from "./labels";
import { localDate, longestStreak } from "./progress";
import { SPORT_BY_KEY, type SportKey } from "./sports";
import type { MuscleGroup, PrType } from "./types";

const DAY = 86_400_000;

export type MonthSummary = {
  month: string; // YYYY-MM
  days: number;
  workouts: number;
  sets: number;
  volumeKg: number;
  minutes: number;
  prs: number;
  longestStreak: number;
  activities: { count: number; minutes: number; calories: number; favorite: string | null };
  starExercise: { id: string; name: string; slug: string | null; sets: number } | null;
  bestPr: { exercise: string; exerciseId: string; type: PrType; value: number; previous: number; gainPct: number } | null;
  muscles: { label: string; sets: number }[];
};

type WorkoutRow = {
  started_at: string;
  ended_at: string;
  workout_exercises: { exercise: { id: string; name: string; slug: string | null; primary_muscle: MuscleGroup } | null; sets: { volume_kg: number; set_type: string; completed: boolean }[] }[];
};

/** "2026-10" → mes anterior / siguiente. */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15))) + (y !== new Date().getFullYear() ? ` ${y}` : "");
}

export async function summarizeMonth(supabase: SupabaseClient, month: string, tz: string): Promise<MonthSummary> {
  const [y, m] = month.split("-").map(Number);
  // Rango amplio en UTC y luego se filtra por el día local del usuario.
  const from = new Date(Date.UTC(y, m - 1, 1) - DAY).toISOString();
  const to = new Date(Date.UTC(y, m, 1) + DAY).toISOString();
  const inMonth = (iso: string) => localDate(new Date(iso), tz).startsWith(month);

  const [wRes, aRes, prRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("started_at, ended_at, workout_exercises(exercise:exercises(id, name, slug, primary_muscle), sets(volume_kg, set_type, completed))")
      .not("ended_at", "is", null)
      .gte("started_at", from)
      .lt("started_at", to),
    supabase.from("activities").select("sport, started_at, duration_minutes, calories").gte("started_at", from).lt("started_at", to),
    supabase.from("personal_records").select("type, value, previous_value, achieved_at, exercise:exercises(id, name)").gte("achieved_at", from).lt("achieved_at", to),
  ]);

  const workouts = ((wRes.data ?? []) as unknown as WorkoutRow[]).filter((w) => inMonth(w.started_at));
  const activities = ((aRes.data ?? []) as { sport: SportKey; started_at: string; duration_minutes: number; calories: number | null }[]).filter((a) => inMonth(a.started_at));
  const prs = ((prRes.data ?? []) as unknown as { type: PrType; value: number; previous_value: number; achieved_at: string; exercise: { id: string; name: string } | null }[]).filter((p) => inMonth(p.achieved_at));

  let sets = 0;
  let volume = 0;
  const perExercise = new Map<string, { id: string; name: string; slug: string | null; sets: number }>();
  const perFamily = new Map<string, number>();
  workouts.forEach((w) =>
    w.workout_exercises.forEach((we) => {
      const work = we.sets.filter((s) => s.completed && s.set_type !== "warmup");
      sets += work.length;
      volume += work.reduce((sum, s) => sum + Number(s.volume_kg || 0), 0);
      if (!we.exercise || work.length === 0) return;
      const e = perExercise.get(we.exercise.id) ?? { id: we.exercise.id, name: we.exercise.name, slug: we.exercise.slug, sets: 0 };
      e.sets += work.length;
      perExercise.set(we.exercise.id, e);
      const fam = Object.values(MUSCLE_FAMILY).find((f) => f.muscles.includes(we.exercise!.primary_muscle));
      if (fam && fam.label !== "Cardio") perFamily.set(fam.label, (perFamily.get(fam.label) ?? 0) + work.length);
    }),
  );

  const gymMinutes = workouts.reduce((sum, w) => sum + (Date.parse(w.ended_at) - Date.parse(w.started_at)) / 60000, 0);
  const sportMinutes = activities.reduce((sum, a) => sum + a.duration_minutes, 0);
  const bySport = new Map<string, number>();
  activities.forEach((a) => bySport.set(a.sport, (bySport.get(a.sport) ?? 0) + a.duration_minutes));
  const favoriteSport = [...bySport.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as SportKey | undefined;

  const dayList = [...workouts.map((w) => w.started_at), ...activities.map((a) => a.started_at)].map((iso) => localDate(new Date(iso), tz));

  const best = prs
    .filter((p) => p.exercise && p.type !== "reps" && p.previous_value > 0)
    .map((p) => ({ ...p, gain: (p.value - p.previous_value) / p.previous_value }))
    .sort((a, b) => b.gain - a.gain)[0];

  return {
    month,
    days: new Set(dayList).size,
    workouts: workouts.length,
    sets,
    volumeKg: volume,
    minutes: Math.round(gymMinutes + sportMinutes),
    prs: prs.length,
    longestStreak: longestStreak(dayList),
    activities: {
      count: activities.length,
      minutes: sportMinutes,
      calories: activities.reduce((sum, a) => sum + (a.calories ?? 0), 0),
      favorite: favoriteSport ? SPORT_BY_KEY[favoriteSport]?.label ?? null : null,
    },
    starExercise: [...perExercise.values()].sort((a, b) => b.sets - a.sets)[0] ?? null,
    bestPr: best
      ? { exercise: best.exercise!.name, exerciseId: best.exercise!.id, type: best.type, value: best.value, previous: best.previous_value, gainPct: best.gain * 100 }
      : null,
    muscles: [...perFamily.entries()].map(([label, s]) => ({ label, sets: s })).sort((a, b) => b.sets - a.sets),
  };
}
