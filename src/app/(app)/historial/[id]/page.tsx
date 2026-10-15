import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ExerciseThumb } from "@/components/exercise-photo";
import { TrendChip } from "@/components/trend-chip";
import { EQUIPMENT_LABEL, PR_LABEL } from "@/lib/labels";
import { compareSessions, compareSet } from "@/lib/progress";
import { requireUser } from "@/lib/supabase/server";
import { formatDay, formatMinutes, formatTime } from "@/lib/text";
import type { Equipment, PrType, SetType, Unit } from "@/lib/types";
import { formatNumber, formatVolume, formatWeight, toUnit } from "@/lib/units";
import { DeleteWorkout } from "./delete-workout";

export const metadata: Metadata = { title: "Entrenamiento" };

type SetRowLite = {
  id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  volume_kg: number;
  personal_records: { type: PrType }[];
};
type WeRow = { id: string; position: number; notes: string | null; superset_group: number | null; exercise: { id: string; slug: string | null; name: string; equipment: Equipment; tracking: string }; sets: SetRowLite[] };
type Summary = { workout_exercise_id: string; exercise_id: string; started_at: string; best_e1rm_kg: number | null; top_weight_kg: number | null };

const TYPE_TAG: Partial<Record<SetType, string>> = { warmup: "C", drop: "D", failure: "F" };

export default async function WorkoutDetailPage({ params }: PageProps<"/historial/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();
  const [{ data: w }, profileRes] = await Promise.all([
    supabase
      .from("workouts")
      .select(
        "id, name, started_at, ended_at, notes, workout_exercises(id, position, notes, superset_group, exercise:exercises(id, slug, name, equipment, tracking), sets(id, position, set_type, weight_kg, reps, duration_seconds, distance_m, volume_kg, personal_records(type)))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profiles").select("unit_system, timezone").eq("id", userId).maybeSingle(),
  ]);
  if (!w) notFound();
  const unit = (profileRes.data?.unit_system ?? "kg") as Unit;
  const tz = profileRes.data?.timezone ?? "America/Bogota";
  const exercises = (w.workout_exercises as unknown as WeRow[]).sort((a, b) => a.position - b.position);
  exercises.forEach((e) => e.sets.sort((a, b) => a.position - b.position));

  // Sesión anterior de cada ejercicio, para comparar.
  const prevByExercise = new Map<string, { summary: Summary; sets: SetRowLite[] }>();
  await Promise.all(
    exercises.map(async (e) => {
      const { data } = await supabase
        .from("exercise_sessions")
        .select("workout_exercise_id, exercise_id, started_at, best_e1rm_kg, top_weight_kg")
        .eq("exercise_id", e.exercise.id)
        .lt("started_at", w.started_at)
        .gt("work_sets", 0)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const { data: prevSets } = await supabase
        .from("sets")
        .select("id, position, set_type, weight_kg, reps, duration_seconds, distance_m, volume_kg")
        .eq("workout_exercise_id", data.workout_exercise_id)
        .eq("completed", true)
        .order("position");
      prevByExercise.set(e.exercise.id, { summary: data as Summary, sets: (prevSets ?? []) as unknown as SetRowLite[] });
    }),
  );

  const allSets = exercises.flatMap((e) => e.sets.filter((s) => s.set_type !== "warmup"));
  const volume = allSets.reduce((sum, s) => sum + Number(s.volume_kg || 0), 0);
  const prCount = exercises.flatMap((e) => e.sets).filter((s) => s.personal_records.length > 0).length;
  const stats = [
    { label: "Duración", value: w.ended_at ? formatMinutes(Date.parse(w.ended_at) - Date.parse(w.started_at)) : "En curso" },
    { label: "Series", value: String(allSets.length) },
    { label: "Volumen", value: formatVolume(volume, unit) },
    { label: "Récords", value: String(prCount) },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <BackButton fallback="/historial" />
        <DeleteWorkout id={w.id} />
      </div>
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight">{w.name}</h1>
        <p className="text-sm text-sub capitalize">
          {formatDay(w.started_at, tz)} · {formatTime(w.started_at, tz)}
        </p>
        {w.notes && <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-[13px] text-sub italic">{w.notes}</p>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface px-2 py-2.5 text-center shadow-(--shadow)">
            <small className="block text-[10.5px] font-semibold text-sub">{s.label}</small>
            <b className="num text-[14px] font-bold">{s.value}</b>
          </div>
        ))}
      </div>

      {exercises.map((e) => {
        const prev = prevByExercise.get(e.exercise.id);
        const best = e.sets.reduce<{ best_e1rm_kg: number | null; top_weight_kg: number | null }>(
          (acc, s) => {
            if (s.set_type === "warmup" || !s.reps) return acc;
            const est = s.weight_kg != null ? (s.reps === 1 ? s.weight_kg : s.weight_kg * (1 + s.reps / 30)) : null;
            return {
              best_e1rm_kg: est != null && s.reps <= 20 ? Math.max(acc.best_e1rm_kg ?? 0, est) : acc.best_e1rm_kg,
              top_weight_kg: s.weight_kg != null ? Math.max(acc.top_weight_kg ?? 0, s.weight_kg) : acc.top_weight_kg,
            };
          },
          { best_e1rm_kg: null, top_weight_kg: null },
        );
        const trend = compareSessions(best, prev?.summary);
        const prevSets = prev?.sets ?? [];
        return (
          <section key={e.id} className="card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/ejercicios/${e.exercise.id}`} className="flex min-w-0 items-center gap-2.5">
                <ExerciseThumb slug={e.exercise.slug} size={40} />
                <span className="min-w-0">
                  <h2 className="truncate font-display text-[16px] font-semibold">{e.exercise.name}</h2>
                  <p className="text-[11.5px] text-sub">{EQUIPMENT_LABEL[e.exercise.equipment]}</p>
                </span>
              </Link>
              <TrendChip trend={trend} />
            </div>
            {e.superset_group != null && exercises.filter((x) => x.superset_group === e.superset_group).length > 1 && (
              <span className="mt-2 inline-block rounded-full bg-a1/14 px-2 py-0.5 text-[10px] font-bold tracking-wide text-a1 uppercase">Superserie</span>
            )}
            {e.notes && <p className="mt-2 text-[12px] text-sub italic">{e.notes}</p>}
            <ul className="mt-2.5 flex flex-col gap-1">
              {e.sets.map((s, i) => {
                const p = prevSets[i];
                const t = s.set_type === "warmup" ? null : compareSet(s, p);
                let n = 0;
                for (let k = 0; k <= i; k++) if (e.sets[k].set_type !== "warmup") n++;
                return (
                  <li key={s.id} className="grid grid-cols-[26px_1fr_auto] items-center gap-2 rounded-xl bg-surface-2/60 px-2.5 py-2 text-[13px]">
                    <span className={`num text-center text-xs font-bold ${s.set_type === "warmup" ? "text-same" : "text-sub"}`}>{TYPE_TAG[s.set_type] ?? n}</span>
                    <span className="num font-semibold tabular-nums">
                      {e.exercise.tracking === "time"
                        ? `${s.duration_seconds ?? 0} s`
                        : e.exercise.tracking === "distance_time"
                          ? `${formatNumber((s.distance_m ?? 0) / 1000, 2)} km · ${formatNumber((s.duration_seconds ?? 0) / 60, 1)} min`
                          : `${formatNumber(toUnit(s.weight_kg, unit), 2)} ${unit} × ${s.reps ?? 0}`}
                      {p && s.set_type !== "warmup" && e.exercise.tracking.endsWith("reps") && (
                        <span className="ml-2 text-[11px] font-normal text-sub">
                          antes {formatNumber(toUnit(p.weight_kg, unit), 2)} × {p.reps ?? 0}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      {s.personal_records.length > 0 && (
                        <span className="chip bg-gold/15 text-gold" title={s.personal_records.map((r) => PR_LABEL[r.type]).join(", ")}>
                          <Trophy size={11} /> PR
                        </span>
                      )}
                      {t === "up" && <span className="size-2 rounded-full bg-up" aria-label="Subiste" />}
                      {t === "down" && <span className="size-2 rounded-full bg-down" aria-label="Bajaste" />}
                      {t === "same" && <span className="size-2 rounded-full bg-same" aria-label="Igual" />}
                    </span>
                  </li>
                );
              })}
            </ul>
            {prev && (
              <p className="mt-2 text-[11px] text-sub">
                Comparado con {formatDay(prev.summary.started_at, tz)}
                {best.top_weight_kg != null && prev.summary.top_weight_kg != null && (
                  <> · peso tope {formatWeight(prev.summary.top_weight_kg, unit)} → {formatWeight(best.top_weight_kg, unit)}</>
                )}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
