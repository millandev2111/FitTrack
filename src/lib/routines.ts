import type { SupabaseClient } from "@supabase/supabase-js";
import { MUSCLE_LABEL } from "./labels";
import type { ExerciseLite, Routine, RoutineExercise } from "./types";

export type RoutineItem = RoutineExercise & { exercise: ExerciseLite };
export type RoutineWithItems = Routine & { items: RoutineItem[] };

export async function fetchRoutines(supabase: SupabaseClient): Promise<RoutineWithItems[]> {
  const { data } = await supabase
    .from("routines")
    .select(
      "id, name, description, position, routine_exercises(id, routine_id, exercise_id, position, target_sets, rep_min, rep_max, rest_seconds, superset_group, notes, exercise:exercises(id, slug, name, primary_muscle, equipment, tracking, default_rest_seconds))",
    )
    .eq("archived", false)
    .order("position")
    .order("created_at");

  type Row = Routine & { routine_exercises: RoutineItem[] };
  return ((data ?? []) as unknown as Row[]).map(({ routine_exercises, ...r }) => ({
    ...r,
    items: [...routine_exercises].sort((a, b) => a.position - b.position),
  }));
}

/** "Pecho · Hombro · Tríceps": los primeros 3 músculos principales de la rutina. */
export function muscleSummary(routine: RoutineWithItems) {
  const muscles = [...new Set(routine.items.map((i) => MUSCLE_LABEL[i.exercise.primary_muscle]))];
  return muscles.slice(0, 3).join(" · ");
}
