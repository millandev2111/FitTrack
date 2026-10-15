import type { Equipment, Unit } from "./types";
import { fromUnit, toUnit, weightStep } from "./units";

/** 1RM estimado (Epley), igual que la columna generada en la base de datos. */
export function e1rm(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null || reps <= 0 || reps > 20) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 1000) / 1000;
}

export type Trend = "up" | "same" | "down";

type Perf = { weight_kg: number | null; reps: number | null };

/** Compara una serie con la misma serie de la sesión anterior: primero peso, luego reps. */
export function compareSet(current: Perf, previous: Perf | undefined): Trend | null {
  if (!previous || current.weight_kg == null || current.reps == null) return null;
  const cw = current.weight_kg;
  const pw = previous.weight_kg ?? 0;
  if (Math.abs(cw - pw) > 0.01) return cw > pw ? "up" : "down";
  const pr = previous.reps ?? 0;
  if (current.reps === pr) return "same";
  return current.reps > pr ? "up" : "down";
}

/** Compara dos sesiones de un ejercicio por su mejor 1RM estimado (o peso tope). */
export function compareSessions(
  current: { best_e1rm_kg: number | null; top_weight_kg: number | null },
  previous: { best_e1rm_kg: number | null; top_weight_kg: number | null } | undefined,
): Trend | null {
  if (!previous) return null;
  const c = current.best_e1rm_kg ?? current.top_weight_kg;
  const p = previous.best_e1rm_kg ?? previous.top_weight_kg;
  if (c == null || p == null) return null;
  const diff = (c - p) / p;
  if (Math.abs(diff) < 0.005) return "same";
  return diff > 0 ? "up" : "down";
}

export type Suggestion =
  | { kind: "increase"; weightKg: number; text: string }
  | { kind: "reps"; text: string }
  | { kind: "hold"; text: string };

/**
 * Doble progresión: si en la sesión anterior todas las series de trabajo llegaron
 * al tope del rango, sube el peso; si no, busca una repetición más con el mismo peso.
 */
export function suggestNext(opts: {
  previous: Perf[];
  repMin: number | null;
  repMax: number | null;
  equipment: Equipment;
  unit: Unit;
}): Suggestion | null {
  const work = opts.previous.filter((s) => s.weight_kg != null && s.reps != null);
  if (work.length === 0) return null;
  const top = Math.max(...work.map((s) => s.weight_kg ?? 0));
  const atTop = work.filter((s) => Math.abs((s.weight_kg ?? 0) - top) < 0.01);
  const repMax = opts.repMax ?? 12;
  const repMin = opts.repMin ?? Math.max(1, repMax - 4);
  const minReps = Math.min(...atTop.map((s) => s.reps ?? 0));

  if (top <= 0) {
    return { kind: "reps", text: "Intenta sumar una repetición por serie." };
  }
  if (minReps >= repMax) {
    const step = weightStep(opts.equipment, opts.unit);
    const nextDisplay = (toUnit(top, opts.unit) ?? 0) + step;
    const next = fromUnit(nextDisplay, opts.unit) ?? top;
    return { kind: "increase", weightKg: next, text: `Completaste ${repMax} reps en todas las series. Sube a` };
  }
  if (minReps < repMin) {
    return { kind: "hold", text: `Mantén el peso hasta llegar a ${repMin}–${repMax} reps en todas las series.` };
  }
  return { kind: "reps", text: "Mismo peso: busca una repetición más que la vez pasada." };
}

/** Racha: días entrenados seguidos permitiendo hasta 2 días de descanso entre ellos. */
export function computeStreak(days: string[], today: string, maxGap = 2): number {
  const unique = [...new Set(days)].sort().reverse();
  if (unique.length === 0) return 0;
  const dayMs = 86_400_000;
  const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
  if ((toTime(today) - toTime(unique[0])) / dayMs > maxGap + 1) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const gap = (toTime(unique[i - 1]) - toTime(unique[i])) / dayMs - 1;
    if (gap > maxGap) break;
    streak++;
  }
  return streak;
}

/** Fecha local YYYY-MM-DD en una zona horaria. */
export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Racha más larga en un rango de días (misma regla: hasta 2 días de descanso entre entrenos). */
export function longestStreak(days: string[], maxGap = 2): number {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return 0;
  const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (toTime(sorted[i]) - toTime(sorted[i - 1])) / 86_400_000 - 1;
    run = gap > maxGap ? 1 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

export type Stagnation = { sessions: number; bestKg: number; since: string };

/**
 * Estancamiento: 3 o más sesiones seguidas sin superar la mejor marca anterior
 * (1RM estimado, o peso tope si no hay). Solo cuenta si la última sesión es reciente.
 * Recibe las sesiones ordenadas de la más antigua a la más reciente.
 */
export function detectStagnation(
  sessions: { started_at: string; best_e1rm_kg: number | null; top_weight_kg: number | null }[],
  now = Date.now(),
): Stagnation | null {
  const points = sessions
    .map((s) => ({ at: s.started_at, v: Number(s.best_e1rm_kg ?? s.top_weight_kg ?? 0) }))
    .filter((p) => p.v > 0);
  if (points.length < 4) return null;
  if (now - Date.parse(points[points.length - 1].at) > 28 * 86_400_000) return null;

  let best = points[0].v;
  let lastImprovement = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].v > best * 1.005) {
      best = points[i].v;
      lastImprovement = i;
    }
  }
  const stalled = points.length - 1 - lastImprovement;
  return stalled >= 3 ? { sessions: stalled, bestKg: best, since: points[lastImprovement].at } : null;
}
