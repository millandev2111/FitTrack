import { BookOpen, ChevronRight, Ruler, Sparkles, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseThumb } from "@/components/exercise-photo";
import { TrendChip } from "@/components/trend-chip";
import { MUSCLE_FAMILY, MUSCLE_LABEL } from "@/lib/labels";
import { compareSessions, computeStreak, detectStagnation, localDate, longestStreak } from "@/lib/progress";
import { requireUser } from "@/lib/supabase/server";
import { relativeDay } from "@/lib/text";
import type { MuscleGroup, Unit } from "@/lib/types";
import { latestWeight } from "@/lib/body";
import { monthLabel } from "@/lib/month-summary";
import { formatNumber, formatWeight, toUnit } from "@/lib/units";
import { ConsistencyMap } from "./consistency-map";
import { MuscleVolume, type MuscleRow } from "./muscle-volume";

export const metadata: Metadata = { title: "Progreso" };

type Session = { exercise_id: string; started_at: string; best_e1rm_kg: number | null; top_weight_kg: number | null; work_sets: number };
type ExerciseInfo = { id: string; slug: string | null; name: string; primary_muscle: MuscleGroup };
const DAY = 86_400_000;

export default async function ProgressPage() {
  const { supabase, userId } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("unit_system, timezone").eq("id", userId).maybeSingle();
  const unit = (profile?.unit_system ?? "kg") as Unit;
  const tz = profile?.timezone ?? "America/Bogota";

  const now = new Date();
  const today = localDate(now, tz);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const thisMonday = new Date(todayTime - ((new Date(todayTime).getUTCDay() + 6) % 7) * DAY).toISOString().slice(0, 10);
  const lastMonday = new Date(Date.parse(`${thisMonday}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);

  const [sessionsRes, daysRes, setsRes, weight] = await Promise.all([
    supabase
      .from("exercise_sessions")
      .select("exercise_id, started_at, best_e1rm_kg, top_weight_kg, work_sets")
      .gt("work_sets", 0)
      .order("started_at", { ascending: false })
      .limit(1500),
    supabase.from("training_days").select("day, kind").gte("day", localDate(new Date(now.getTime() - 150 * DAY), tz)),
    supabase
      .from("sets")
      .select("performed_at, exercise:exercises(primary_muscle)")
      .eq("completed", true)
      .neq("set_type", "warmup")
      .gte("performed_at", new Date(now.getTime() - 16 * DAY).toISOString())
      .limit(2000),
    latestWeight(supabase),
  ]);

  // ----- Constancia -----
  const days = (daysRes.data ?? []) as { day: string; kind: "gym" | "sport" }[];
  const dayList = days.map((d) => d.day);
  const consistency = {
    trained: new Set(dayList).size,
    current: computeStreak(dayList, today),
    longest: longestStreak(dayList),
  };

  // ----- Series por músculo (esta semana y la anterior) -----
  const counts = new Map<string, { thisWeek: number; lastWeek: number }>();
  const familyOf = (m: MuscleGroup) => Object.entries(MUSCLE_FAMILY).find(([, f]) => f.muscles.includes(m))?.[0];
  ((setsRes.data ?? []) as unknown as { performed_at: string; exercise: { primary_muscle: MuscleGroup } | null }[]).forEach((s) => {
    const fam = s.exercise ? familyOf(s.exercise.primary_muscle) : undefined;
    if (!fam || fam === "cardio") return;
    const day = localDate(new Date(s.performed_at), tz);
    const entry = counts.get(fam) ?? { thisWeek: 0, lastWeek: 0 };
    if (day >= thisMonday) entry.thisWeek++;
    else if (day >= lastMonday) entry.lastWeek++;
    counts.set(fam, entry);
  });
  const muscleRows: MuscleRow[] = Object.entries(MUSCLE_FAMILY)
    .filter(([key]) => key !== "cardio")
    .map(([key, f]) => ({ key, label: f.label, ...(counts.get(key) ?? { thisWeek: 0, lastWeek: 0 }) }));

  // ----- Ejercicios -----
  const sessions = (sessionsRes.data ?? []) as Session[];
  const byExercise = new Map<string, Session[]>();
  sessions.forEach((s) => byExercise.set(s.exercise_id, [...(byExercise.get(s.exercise_id) ?? []), s]));
  const ids = [...byExercise.keys()];
  const { data: exData } = ids.length
    ? await supabase.from("exercises").select("id, slug, name, primary_muscle").in("id", ids)
    : { data: [] as ExerciseInfo[] };
  const info = new Map(((exData ?? []) as ExerciseInfo[]).map((e) => [e.id, e]));

  const rows = ids
    .map((id) => {
      const list = byExercise.get(id)!;
      return { id, ex: info.get(id), last: list[0], prev: list[1], stagnation: detectStagnation([...list].reverse(), now.getTime()) };
    })
    .filter((r): r is typeof r & { ex: ExerciseInfo } => Boolean(r.ex));
  const stalled = rows.filter((r) => r.stagnation).slice(0, 3);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[26px] font-bold tracking-tight">Progreso</h1>
        <Link href="/ejercicios" className="btn btn-ghost h-10 rounded-[14px] px-3.5 text-sm">
          <BookOpen size={17} /> Catálogo
        </Link>
      </div>

      <ConsistencyMap days={days} today={today} stats={consistency} />

      {stalled.map((r) => (
        <Link key={r.id} href={`/ejercicios/${r.id}`} className="flex items-start gap-2.5 rounded-[18px] bg-same/14 px-3.5 py-3 text-[12.5px] leading-snug">
          <TriangleAlert size={19} className="mt-px flex-none text-same" />
          <span className="min-w-0 flex-1">
            <b className="block text-[13px]">
              {r.ex.name}: {r.stagnation!.sessions} sesiones sin progresar
            </b>
            <span className="text-sub">
              Tu mejor marca sigue en {formatWeight(r.stagnation!.bestKg, unit)} de 1RM estimado. Prueba otro rango de repeticiones (por ejemplo 3 × 8 con un 10 % menos de peso) o una semana de descarga.
            </span>
          </span>
          <ChevronRight size={16} className="mt-0.5 flex-none text-sub" />
        </Link>
      ))}

      <MuscleVolume rows={muscleRows} />

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/cuerpo" className="card flex flex-col gap-1 p-3.5">
          <Ruler size={20} className="text-a2" />
          <small className="mt-1 text-[11.5px] font-semibold text-sub">Peso corporal</small>
          <b className="num text-[20px] leading-tight font-bold">
            {weight != null ? `${formatNumber(toUnit(weight, unit), 1)} ${unit}` : "Registrar"}
          </b>
          <small className="text-[11px] text-sub">Medidas y fotos</small>
        </Link>
        <Link href={`/resumen/${today.slice(0, 7)}`} className="grad flex flex-col gap-1 rounded-[22px] p-3.5">
          <Sparkles size={20} />
          <small className="mt-1 text-[11.5px] font-semibold opacity-85">Resumen de</small>
          <b className="font-display text-[20px] leading-tight font-bold capitalize">{monthLabel(today.slice(0, 7))}</b>
          <small className="text-[11px] opacity-85">Tus números del mes</small>
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold">Tus ejercicios</h2>
          <span className="text-xs text-sub">última sesión vs. anterior</span>
        </div>
        {rows.length === 0 ? (
          <div className="card p-5 text-sm text-sub">Cuando completes tu primera sesión verás aquí cómo evoluciona cada ejercicio.</div>
        ) : (
          <ul className="card flex flex-col px-3.5 py-1">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/ejercicios/${r.id}`} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <ExerciseThumb slug={r.ex.slug} size={44} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">{r.ex.name}</b>
                    <small className="block truncate text-[11.5px] text-sub">
                      {MUSCLE_LABEL[r.ex.primary_muscle]} · {relativeDay(r.last.started_at, tz)}
                      {r.last.top_weight_kg ? ` · ${formatWeight(r.last.top_weight_kg, unit)}` : ""}
                    </small>
                  </span>
                  {r.stagnation ? <span className="chip chip-same">Estancado</span> : <TrendChip trend={compareSessions(r.last, r.prev)} />}
                  <ChevronRight size={16} className="flex-none text-sub" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
