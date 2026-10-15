"use client";

import { Check, Trophy } from "lucide-react";
import Link from "next/link";
import { useSyncStatus } from "@/lib/hooks";
import { PR_LABEL } from "@/lib/labels";
import type { LiveWorkout } from "@/lib/live/workout";
import { formatMinutes } from "@/lib/text";
import type { PersonalRecord, Unit } from "@/lib/types";
import { formatNumber, formatVolume, formatWeight } from "@/lib/units";

export function SessionSummary({ workout, prs, unit }: { workout: LiveWorkout; prs: PersonalRecord[]; unit: Unit }) {
  const sync = useSyncStatus();
  const sets = workout.exercises.flatMap((e) => e.sets.filter((s) => s.completed && s.set_type !== "warmup"));
  const volume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
  const duration = Date.parse(workout.ended_at!) - Date.parse(workout.started_at);
  const names = new Map(workout.exercises.map((e) => [e.exercise.id, e.exercise.name]));

  const stats = [
    { label: "Duración", value: formatMinutes(duration) },
    { label: "Series", value: String(sets.length) },
    { label: "Volumen", value: formatVolume(volume, unit) },
    { label: "Récords", value: String(new Set(prs.map((p) => p.set_id)).size) },
  ];

  return (
    <div className="relative flex flex-col gap-5 pt-6">
      <div className="glow" />
      <div className="pop-in relative flex flex-col items-center gap-3 text-center">
        <span className="grad grid size-20 place-items-center rounded-[28px]">
          <Check size={42} strokeWidth={3} />
        </span>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">¡Entrenamiento terminado!</h1>
        <p className="text-sm text-sub">
          {workout.name} ·{" "}
          {sync.pending > 0 ? (sync.offline ? "se subirá cuando tengas conexión" : "guardando…") : "guardado"}
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="card px-4 py-3.5">
            <small className="text-xs font-semibold text-sub">{s.label}</small>
            <div className="num text-[22px] font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {prs.length > 0 && (
        <section className="card relative p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-[15px] font-semibold">
            <Trophy size={18} className="text-gold" /> Récords de hoy
          </h2>
          <ul className="flex flex-col">
            {prs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-t border-line py-2.5 first:border-0">
                <span className="min-w-0">
                  <b className="block truncate text-sm">{names.get(p.exercise_id) ?? "Ejercicio"}</b>
                  <small className="text-xs text-sub">{PR_LABEL[p.type]}</small>
                </span>
                <span className="chip chip-up">
                  {p.type === "reps" ? `${formatNumber(p.value, 0)} reps` : formatWeight(p.value, unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="relative flex flex-col gap-2.5">
        <Link href={`/historial/${workout.id}`} className="btn grad w-full">
          Ver detalle
        </Link>
        <Link href="/" className="btn btn-ghost w-full">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
