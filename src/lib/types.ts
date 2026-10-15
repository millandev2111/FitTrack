import type { Accent, ThemePref } from "./theme";

export type Unit = "kg" | "lb";

export type MuscleGroup =
  | "chest" | "back" | "lower_back" | "traps" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "quads" | "hamstrings" | "glutes" | "adductors" | "calves" | "abs" | "obliques" | "full_body" | "cardio";

export type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "band" | "smith_machine" | "ez_bar" | "other";

export type Tracking = "weight_reps" | "bodyweight_reps" | "time" | "distance_time";
export type SetType = "warmup" | "normal" | "drop" | "failure";
export type PrType = "weight" | "e1rm" | "reps";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  unit_system: Unit;
  theme: ThemePref;
  accent: Accent;
  weekly_goal: number;
  default_rest_seconds: number;
  timezone: string;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  slug: string | null;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: Equipment;
  tracking: Tracking;
  is_unilateral: boolean;
  default_rest_seconds: number | null;
  archived: boolean;
}

export type ExerciseLite = Pick<Exercise, "id" | "name" | "primary_muscle" | "equipment" | "tracking" | "default_rest_seconds"> & { slug?: string | null };

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_seconds: number | null;
  superset_group: number | null;
  notes: string | null;
}

export interface SetRow {
  id: string;
  workout_exercise_id: string;
  exercise_id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
  performed_at: string;
}

export interface PersonalRecord {
  id: string;
  exercise_id: string;
  set_id: string;
  type: PrType;
  value: number;
  previous_value: number;
  weight_kg: number | null;
  reps: number | null;
  achieved_at: string;
}
