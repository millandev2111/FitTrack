"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseLite, SetType } from "@/lib/types";
import { enqueue } from "./outbox";

export interface LiveSet {
  id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  completed: boolean;
  performed_at: string | null;
}

export interface PrevSet {
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
}

export interface LiveExercise {
  id: string; // workout_exercises.id
  exercise: ExerciseLite;
  position: number;
  notes: string | null;
  target_sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_seconds: number | null;
  superset_group: number | null;
  sets: LiveSet[];
  previous: PrevSet[] | null;
  previous_at: string | null;
}

export interface LiveWorkout {
  id: string;
  name: string;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes?: string | null;
  exercises: LiveExercise[];
}

const ACTIVE_KEY = "ft-active";
const liveKey = (id: string) => `ft-live:${id}`;

export function getActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function loadLocal(id: string): LiveWorkout | null {
  try {
    const raw = localStorage.getItem(liveKey(id));
    return raw ? (JSON.parse(raw) as LiveWorkout) : null;
  } catch {
    return null;
  }
}

export function saveLocal(workout: LiveWorkout) {
  try {
    localStorage.setItem(liveKey(workout.id), JSON.stringify(workout));
    if (!workout.ended_at) localStorage.setItem(ACTIVE_KEY, workout.id);
  } catch {}
}

export function clearLocal(id: string) {
  try {
    localStorage.removeItem(liveKey(id));
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

export function newSet(position: number, from?: Partial<LiveSet> | PrevSet): LiveSet {
  return {
    id: crypto.randomUUID(),
    position,
    set_type: from?.set_type === "warmup" ? "warmup" : "normal",
    weight_kg: from?.weight_kg ?? null,
    reps: from?.reps ?? null,
    rir: null,
    duration_seconds: from?.duration_seconds ?? null,
    distance_m: from?.distance_m ?? null,
    completed: false,
    performed_at: null,
  };
}

/**
 * Series iniciales: copia los calentamientos y las series de la sesión anterior
 * y ajusta la cantidad de series de trabajo al objetivo de la rutina.
 */
export function initialSets(target: number, previous: PrevSet[] | null): LiveSet[] {
  const goal = Math.max(1, target);
  if (!previous || previous.length === 0) return Array.from({ length: goal }, (_, i) => newSet(i));
  const warmups = previous.filter((p) => p.set_type === "warmup");
  const work = previous.filter((p) => p.set_type !== "warmup");
  const plan: (PrevSet | undefined)[] = [...warmups];
  for (let i = 0; i < goal; i++) plan.push(work[i] ?? work[work.length - 1]);
  return plan.map((p, i) => newSet(i, p));
}

// ----- Filas para Supabase -----

export function workoutRow(w: LiveWorkout) {
  return { id: w.id, name: w.name, routine_id: w.routine_id, started_at: w.started_at, ended_at: w.ended_at, notes: w.notes ?? null };
}

export function exerciseRow(workoutId: string, e: LiveExercise) {
  return {
    id: e.id,
    workout_id: workoutId,
    exercise_id: e.exercise.id,
    position: e.position,
    superset_group: e.superset_group,
    notes: e.notes,
  };
}

export function setRow(workoutExerciseId: string, s: LiveSet) {
  return {
    id: s.id,
    workout_exercise_id: workoutExerciseId,
    position: s.position,
    set_type: s.set_type,
    weight_kg: s.weight_kg,
    reps: s.reps,
    rir: s.rir,
    duration_seconds: s.duration_seconds,
    distance_m: s.distance_m,
    completed: true,
    performed_at: s.performed_at ?? new Date().toISOString(),
  };
}

/** Registra la sesión nueva en la cola (solo se guardan las series completadas). */
export function enqueueNewWorkout(w: LiveWorkout) {
  enqueue({ kind: "upsert", table: "workouts", row: workoutRow(w) });
  w.exercises.forEach((e) => enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, e) }));
}

// ----- Sesión anterior -----

type PrevRow = PrevSet & { workout_exercise_id: string; performed_at: string };

export async function fetchPrevious(
  supabase: SupabaseClient,
  exerciseIds: string[],
  excludeWorkoutExerciseIds: string[] = [],
): Promise<Record<string, { sets: PrevSet[]; at: string } | null>> {
  const result: Record<string, { sets: PrevSet[]; at: string } | null> = {};
  await Promise.all(
    [...new Set(exerciseIds)].map(async (exerciseId) => {
      const { data } = await supabase
        .from("sets")
        .select("workout_exercise_id, position, set_type, weight_kg, reps, duration_seconds, distance_m, performed_at")
        .eq("exercise_id", exerciseId)
        .eq("completed", true)
        .order("performed_at", { ascending: false })
        .limit(40);
      const rows = ((data ?? []) as PrevRow[]).filter((r) => !excludeWorkoutExerciseIds.includes(r.workout_exercise_id));
      if (rows.length === 0) {
        result[exerciseId] = null;
        return;
      }
      const weId = rows[0].workout_exercise_id;
      const sets = rows
        .filter((r) => r.workout_exercise_id === weId)
        .sort((a, b) => a.position - b.position)
        .map(({ position, set_type, weight_kg, reps, duration_seconds, distance_m }) => ({
          position,
          set_type,
          weight_kg: weight_kg == null ? null : Number(weight_kg),
          reps,
          duration_seconds,
          distance_m: distance_m == null ? null : Number(distance_m),
        }));
      result[exerciseId] = { sets, at: rows[0].performed_at };
    }),
  );
  return result;
}

/** Reconstruye una sesión desde Supabase (p. ej. abierta en otro dispositivo). */
export async function loadFromServer(supabase: SupabaseClient, id: string): Promise<LiveWorkout | null> {
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, name, routine_id, started_at, ended_at, notes, workout_exercises(id, position, notes, superset_group, exercise:exercises(id, slug, name, primary_muscle, equipment, tracking, default_rest_seconds), sets(id, position, set_type, weight_kg, reps, rir, duration_seconds, distance_m, completed, performed_at))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!w) return null;

  type Row = {
    id: string;
    position: number;
    notes: string | null;
    superset_group: number | null;
    exercise: ExerciseLite;
    sets: (Omit<LiveSet, "weight_kg" | "distance_m"> & { weight_kg: number | null; distance_m: number | null })[];
  };
  const rows = (w.workout_exercises as unknown as Row[]).sort((a, b) => a.position - b.position);
  const previous = await fetchPrevious(
    supabase,
    rows.map((r) => r.exercise.id),
    rows.map((r) => r.id),
  );

  return {
    id: w.id,
    name: w.name,
    routine_id: w.routine_id,
    started_at: w.started_at,
    ended_at: w.ended_at,
    notes: w.notes,
    exercises: rows.map((r) => ({
      id: r.id,
      exercise: r.exercise,
      position: r.position,
      notes: r.notes,
      superset_group: r.superset_group,
      target_sets: Math.max(1, r.sets.length),
      rep_min: null,
      rep_max: null,
      rest_seconds: null,
      previous: previous[r.exercise.id]?.sets ?? null,
      previous_at: previous[r.exercise.id]?.at ?? null,
      sets: r.sets
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, weight_kg: s.weight_kg == null ? null : Number(s.weight_kg), distance_m: s.distance_m == null ? null : Number(s.distance_m) })),
    })),
  };
}
