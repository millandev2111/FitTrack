import { Activity, Bike, Dumbbell, Flower2, Footprints, HandFist, Mountain, MountainSnow, Music, Swords, Volleyball } from "lucide-react";
import type { ComponentType } from "react";
import { Basketball, Racket, SoccerBall, Swim } from "@/components/sport-icons";

export type SportKey =
  | "soccer" | "basketball" | "running" | "cycling" | "swimming" | "tennis" | "padel" | "volleyball"
  | "boxing" | "martial_arts" | "crossfit" | "yoga" | "hiking" | "walking" | "climbing" | "dance" | "other";

export type SportField =
  | { key: string; label: string; kind: "int"; max?: number }
  | { key: string; label: string; kind: "select"; options: string[] };

export type Sport = {
  key: SportKey;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** MET de referencia a intensidad media (Compendium of Physical Activities). */
  met: number;
  distance: boolean;
  fields: SportField[];
};

const RESULT: SportField = { key: "result", label: "Resultado", kind: "select", options: ["Ganado", "Empate", "Perdido"] };

export const SPORTS: Sport[] = [
  { key: "soccer", label: "Fútbol", Icon: SoccerBall, met: 7, distance: true, fields: [{ key: "goals", label: "Goles", kind: "int" }, { key: "assists", label: "Asistencias", kind: "int" }, { key: "position", label: "Posición", kind: "select", options: ["Portero", "Defensa", "Volante", "Delantero"] }, RESULT] },
  { key: "basketball", label: "Baloncesto", Icon: Basketball, met: 6.5, distance: false, fields: [{ key: "points", label: "Puntos", kind: "int" }, { key: "rebounds", label: "Rebotes", kind: "int" }, { key: "assists", label: "Asistencias", kind: "int" }, RESULT] },
  { key: "running", label: "Running", Icon: Footprints, met: 9.8, distance: true, fields: [{ key: "elevation_m", label: "Desnivel (m)", kind: "int", max: 9999 }] },
  { key: "cycling", label: "Ciclismo", Icon: Bike, met: 7.5, distance: true, fields: [{ key: "elevation_m", label: "Desnivel (m)", kind: "int", max: 9999 }] },
  { key: "swimming", label: "Natación", Icon: Swim, met: 7, distance: true, fields: [{ key: "laps", label: "Piscinas", kind: "int", max: 999 }, { key: "style", label: "Estilo", kind: "select", options: ["Libre", "Espalda", "Pecho", "Mariposa", "Combinado"] }] },
  { key: "tennis", label: "Tenis", Icon: Racket, met: 7.3, distance: false, fields: [{ key: "sets_won", label: "Sets ganados", kind: "int" }, { key: "sets_lost", label: "Sets perdidos", kind: "int" }, RESULT] },
  { key: "padel", label: "Pádel", Icon: Racket, met: 6, distance: false, fields: [{ key: "sets_won", label: "Sets ganados", kind: "int" }, { key: "sets_lost", label: "Sets perdidos", kind: "int" }, RESULT] },
  { key: "volleyball", label: "Voleibol", Icon: Volleyball, met: 4, distance: false, fields: [{ key: "points", label: "Puntos", kind: "int" }, RESULT] },
  { key: "boxing", label: "Boxeo", Icon: HandFist, met: 7.8, distance: false, fields: [{ key: "rounds", label: "Rounds", kind: "int" }] },
  { key: "martial_arts", label: "Artes marciales", Icon: Swords, met: 10.3, distance: false, fields: [{ key: "rounds", label: "Rounds", kind: "int" }] },
  { key: "crossfit", label: "CrossFit", Icon: Dumbbell, met: 8, distance: false, fields: [{ key: "wod", label: "Rondas completadas", kind: "int" }] },
  { key: "yoga", label: "Yoga", Icon: Flower2, met: 2.5, distance: false, fields: [] },
  { key: "hiking", label: "Senderismo", Icon: Mountain, met: 6, distance: true, fields: [{ key: "elevation_m", label: "Desnivel (m)", kind: "int", max: 9999 }] },
  { key: "walking", label: "Caminata", Icon: Footprints, met: 3.5, distance: true, fields: [] },
  { key: "climbing", label: "Escalada", Icon: MountainSnow, met: 8, distance: false, fields: [{ key: "routes", label: "Vías", kind: "int" }] },
  { key: "dance", label: "Baile", Icon: Music, met: 5, distance: false, fields: [] },
  { key: "other", label: "Otro", Icon: Activity, met: 5, distance: true, fields: [] },
];

export const SPORT_BY_KEY = Object.fromEntries(SPORTS.map((s) => [s.key, s])) as Record<SportKey, Sport>;

export const INTENSITY = ["Muy suave", "Suave", "Moderada", "Alta", "Máxima"] as const;
const INTENSITY_FACTOR = [0.7, 0.85, 1, 1.15, 1.3];

/** kcal ≈ MET × peso (kg) × horas, ajustado por intensidad. En running se usa la velocidad. */
export function estimateCalories(sport: Sport, minutes: number, weightKg: number, intensity: number, distanceKm?: number | null) {
  let met = sport.met;
  if (sport.key === "running" && distanceKm && minutes > 0) {
    const kmh = distanceKm / (minutes / 60);
    met = Math.min(19, Math.max(6, kmh)); // correr ≈ 1 MET por km/h
  }
  const factor = sport.key === "running" && distanceKm ? 1 : INTENSITY_FACTOR[Math.max(1, Math.min(5, intensity)) - 1];
  return Math.round(met * weightKg * (minutes / 60) * factor);
}

/** Ritmo min/km para running y caminata. */
export function pace(minutes: number, distanceKm: number | null | undefined) {
  if (!distanceKm || distanceKm <= 0 || minutes <= 0) return null;
  const perKm = minutes / distanceKm;
  const m = Math.floor(perKm);
  const s = Math.round((perKm - m) * 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, "0")} /km`;
}
