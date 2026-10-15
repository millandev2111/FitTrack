"use client";

import type { RoutineWithItems } from "@/lib/routines";
import { createClient } from "@/lib/supabase/client";
import { enqueueNewWorkout, fetchPrevious, initialSets, saveLocal, type LiveWorkout } from "./workout";

export const sessionUrl = (id: string) => `/sesion?id=${id}`;

/** Abre la sesión; sin conexión hace una navegación completa para que la sirva el service worker. */
export function openSession(router: { push: (href: string) => void }, id: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) window.location.assign(sessionUrl(id));
  else router.push(sessionUrl(id));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]).catch(() => fallback);
}

/** Crea la sesión en el teléfono (funciona sin conexión) y devuelve su id. */
export async function startWorkout(routine: RoutineWithItems | null): Promise<string> {
  const id = crypto.randomUUID();
  const items = routine?.items ?? [];
  const previous = items.length
    ? await withTimeout(fetchPrevious(createClient(), items.map((i) => i.exercise.id)), 3000, {})
    : {};

  const workout: LiveWorkout = {
    id,
    name: routine?.name ?? "Entreno libre",
    routine_id: routine?.id ?? null,
    started_at: new Date().toISOString(),
    ended_at: null,
    exercises: items.map((item, i) => {
      const prev = previous[item.exercise.id] ?? null;
      return {
        id: crypto.randomUUID(),
        exercise: item.exercise,
        position: i,
        notes: item.notes,
        target_sets: item.target_sets,
        rep_min: item.rep_min,
        rep_max: item.rep_max,
        rest_seconds: item.rest_seconds,
        superset_group: item.superset_group,
        sets: initialSets(item.target_sets, prev?.sets ?? null),
        previous: prev?.sets ?? null,
        previous_at: prev?.at ?? null,
      };
    }),
  };

  saveLocal(workout);
  enqueueNewWorkout(workout);
  return id;
}
