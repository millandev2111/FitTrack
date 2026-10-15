import type { Metadata } from "next";
import { fetchRoutines } from "@/lib/routines";
import { requireUser } from "@/lib/supabase/server";
import { StartWorkout } from "./start-workout";

export const metadata: Metadata = { title: "Entrenar" };

export default async function TrainPage() {
  const { supabase } = await requireUser();
  const [routines, open] = await Promise.all([
    fetchRoutines(supabase),
    supabase.from("workouts").select("id").is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return <StartWorkout routines={routines} openWorkoutId={open.data?.id ?? null} />;
}
