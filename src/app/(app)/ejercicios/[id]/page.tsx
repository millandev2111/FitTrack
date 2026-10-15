import { TriangleAlert, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ExerciseMotion } from "@/components/exercise-photo";
import { TrendChip } from "@/components/trend-chip";
import { EQUIPMENT_LABEL, MUSCLE_LABEL, PR_LABEL } from "@/lib/labels";
import { compareSessions, detectStagnation } from "@/lib/progress";
import { requireUser } from "@/lib/supabase/server";
import { formatDay, relativeDay } from "@/lib/text";
import type { Exercise, PrType, Unit } from "@/lib/types";
import { formatNumber, formatVolume, formatWeight, toUnit } from "@/lib/units";
import { ProgressChart } from "./progress-chart";

export const metadata: Metadata = { title: "Ejercicio" };

type Session = {
  workout_exercise_id: string;
  workout_id: string;
  started_at: string;
  work_sets: number;
  top_weight_kg: number | null;
  best_e1rm_kg: number | null;
  volume_kg: number;
};
type SetLite = { workout_exercise_id: string; position: number; set_type: string; weight_kg: number | null; reps: number | null; duration_seconds: number | null };

function setsSummary(sets: SetLite[], unit: Unit) {
  const work = sets.filter((s) => s.set_type !== "warmup").sort((a, b) => a.position - b.position);
  if (work.length === 0) return "Solo calentamiento";
  if (work.every((s) => s.reps == null && s.duration_seconds != null)) return work.map((s) => `${s.duration_seconds} s`).join(" · ");
  const weights = [...new Set(work.map((s) => s.weight_kg ?? 0))];
  if (weights.length === 1) return `${formatWeight(weights[0], unit)} · ${work.map((s) => s.reps ?? "–").join(" · ")}`;
  return work.map((s) => `${formatNumber(toUnit(s.weight_kg, unit), 1)}×${s.reps ?? "–"}`).join(" · ");
}

export default async function ExercisePage({ params }: PageProps<"/ejercicios/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();

  const [exRes, profileRes, sessionsRes, setsRes, prsRes, bestRes] = await Promise.all([
    supabase.from("exercises").select("id, user_id, slug, name, primary_muscle, secondary_muscles, equipment, tracking, is_unilateral, default_rest_seconds, archived").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("unit_system, timezone").eq("id", userId).maybeSingle(),
    supabase.from("exercise_sessions").select("workout_exercise_id, workout_id, started_at, work_sets, top_weight_kg, best_e1rm_kg, volume_kg").eq("exercise_id", id).gt("work_sets", 0).order("started_at", { ascending: true }).limit(200),
    supabase.from("sets").select("workout_exercise_id, position, set_type, weight_kg, reps, duration_seconds").eq("exercise_id", id).eq("completed", true).order("performed_at", { ascending: false }).limit(400),
    supabase.from("personal_records").select("id, type, value, previous_value, weight_kg, reps, achieved_at").eq("exercise_id", id).order("achieved_at", { ascending: false }).limit(6),
    supabase.from("sets").select("weight_kg, reps").eq("exercise_id", id).eq("completed", true).neq("set_type", "warmup").gt("reps", 0).order("weight_kg", { ascending: false }).order("reps", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const exercise = exRes.data as Exercise | null;
  if (!exercise) notFound();
  const unit = (profileRes.data?.unit_system ?? "kg") as Unit;
  const tz = profileRes.data?.timezone ?? "America/Bogota";
  const sessions = (sessionsRes.data ?? []) as Session[];
  const sets = (setsRes.data ?? []) as SetLite[];
  const prs = (prsRes.data ?? []) as { id: string; type: PrType; value: number; previous_value: number; weight_kg: number | null; reps: number | null; achieved_at: string }[];

  const bestE1rm = Math.max(0, ...sessions.map((s) => s.best_e1rm_kg ?? 0));
  const bestVolume = Math.max(0, ...sessions.map((s) => Number(s.volume_kg) || 0));
  const best = bestRes.data as { weight_kg: number | null; reps: number | null } | null;
  const isWeight = exercise.tracking === "weight_reps" || exercise.tracking === "bodyweight_reps";

  const history = [...sessions].reverse().slice(0, 15);
  const stagnation = detectStagnation(sessions);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2.5">
        <BackButton fallback="/progreso" />
        <div className="min-w-0 text-center">
          <h1 className="truncate font-display text-[17px] font-semibold">{exercise.name}</h1>
          <p className="text-xs text-sub">
            {EQUIPMENT_LABEL[exercise.equipment]} · {MUSCLE_LABEL[exercise.primary_muscle]}
          </p>
        </div>
      </div>

      <ExerciseMotion slug={exercise.slug} name={exercise.name} />

      {isWeight && (
        <ProgressChart
          unit={unit}
          tz={tz}
          points={sessions.map((s) => ({ at: s.started_at, e1rm: s.best_e1rm_kg, top: s.top_weight_kg, volume: Number(s.volume_kg) || 0 }))}
        />
      )}

      {stagnation && (
        <div className="flex items-start gap-2.5 rounded-[18px] bg-same/14 px-3.5 py-3 text-[12.5px] leading-snug">
          <TriangleAlert size={19} className="mt-px flex-none text-same" />
          <span>
            <b className="block text-[13px]">{stagnation.sessions} sesiones sin superar tu mejor marca</b>
            <span className="text-sub">
              Prueba otro rango de repeticiones (por ejemplo 3 × 8 con un 10 % menos de peso), cambia el orden de tu rutina o haz una semana de descarga con la mitad de las series.
            </span>
          </span>
        </div>
      )}

      {isWeight && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <small className="block text-[10.5px] font-semibold text-sub">Peso máximo</small>
            <b className="num text-[15px] font-bold">{best?.weight_kg != null ? formatWeight(best.weight_kg, unit) : "–"}</b>
            {best?.reps != null && <span className="text-[11px] text-sub"> × {best.reps}</span>}
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <small className="block text-[10.5px] font-semibold text-sub">Mejor 1RM estimado</small>
            <b className="num text-[15px] font-bold">{bestE1rm ? formatWeight(bestE1rm, unit) : "–"}</b>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <small className="block text-[10.5px] font-semibold text-sub">Mejor volumen</small>
            <b className="num text-[15px] font-bold">{bestVolume ? formatVolume(bestVolume, unit) : "–"}</b>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <small className="block text-[10.5px] font-semibold text-sub">Sesiones</small>
            <b className="num text-[15px] font-bold">{sessions.length}</b>
          </div>
        </div>
      )}

      {prs.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-[15px] font-semibold">Récords</h2>
          <ul className="card flex flex-col px-3.5 py-1">
            {prs.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                <Trophy size={18} className="flex-none text-gold" />
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px]">{PR_LABEL[p.type]}</b>
                  <small className="text-[11.5px] text-sub">
                    {relativeDay(p.achieved_at, tz)} · antes {p.type === "reps" ? `${formatNumber(p.previous_value, 0)} reps` : formatWeight(p.previous_value, unit)}
                  </small>
                </span>
                <span className="chip chip-up">{p.type === "reps" ? `${formatNumber(p.value, 0)} reps` : formatWeight(p.value, unit)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold">Historial</h2>
          <span className="text-xs text-sub">vs. sesión anterior</span>
        </div>
        {history.length === 0 ? (
          <div className="card p-4 text-sm text-sub">Aún no has hecho este ejercicio.</div>
        ) : (
          <ul className="card flex flex-col px-3.5 py-1">
            {history.map((s) => {
              const idx = sessions.indexOf(s);
              const trend = compareSessions(s, sessions[idx - 1]);
              return (
                <li key={s.workout_exercise_id}>
                  <Link href={`/historial/${s.workout_id}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                    <span className="min-w-0 flex-1">
                      <b className="block text-[13.5px] capitalize">{formatDay(s.started_at, tz)}</b>
                      <small className="block truncate text-[11.5px] text-sub tabular-nums">
                        {setsSummary(sets.filter((x) => x.workout_exercise_id === s.workout_exercise_id), unit)}
                      </small>
                    </span>
                    <TrendChip trend={trend} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
