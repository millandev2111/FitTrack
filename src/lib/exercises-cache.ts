"use client";

import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";

const KEY = "ft-exercises";
const COLUMNS = "id, user_id, slug, name, primary_muscle, secondary_muscles, equipment, tracking, is_unilateral, default_rest_seconds, archived";

export function cachedExercises(): Exercise[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Catálogo global + propios. Usa la copia local si no hay conexión. */
export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await createClient().from("exercises").select(COLUMNS).eq("archived", false).order("name");
  if (error || !data) return cachedExercises();
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return data as Exercise[];
}

export async function createExercise(input: Omit<Exercise, "id" | "slug" | "archived" | "secondary_muscles" | "is_unilateral" | "default_rest_seconds"> & { user_id: string }) {
  const { data, error } = await createClient()
    .from("exercises")
    .insert({ ...input })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  try {
    localStorage.setItem(KEY, JSON.stringify([...cachedExercises(), data]));
  } catch {}
  return data as Exercise;
}
