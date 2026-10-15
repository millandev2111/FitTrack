import type { Equipment, MuscleGroup, PrType, Tracking } from "./types";

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  lower_back: "Lumbar",
  traps: "Trapecio",
  shoulders: "Hombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebrazo",
  quads: "Cuádriceps",
  hamstrings: "Femoral",
  glutes: "Glúteo",
  adductors: "Aductores",
  calves: "Pantorrilla",
  abs: "Abdomen",
  obliques: "Oblicuos",
  full_body: "Cuerpo completo",
  cardio: "Cardio",
};

/** Grupos amplios para filtros y para el volumen semanal. */
export const MUSCLE_FAMILY: Record<string, { label: string; muscles: MuscleGroup[] }> = {
  pecho: { label: "Pecho", muscles: ["chest"] },
  espalda: { label: "Espalda", muscles: ["back", "lower_back", "traps"] },
  hombro: { label: "Hombro", muscles: ["shoulders"] },
  brazos: { label: "Brazos", muscles: ["biceps", "triceps", "forearms"] },
  piernas: { label: "Piernas", muscles: ["quads", "hamstrings", "glutes", "adductors", "calves"] },
  core: { label: "Core", muscles: ["abs", "obliques"] },
  cardio: { label: "Cardio", muscles: ["cardio", "full_body"] },
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  cable: "Polea",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  band: "Banda",
  smith_machine: "Smith",
  ez_bar: "Barra Z",
  other: "Otro",
};

export const TRACKING_LABEL: Record<Tracking, string> = {
  weight_reps: "Peso y repeticiones",
  bodyweight_reps: "Repeticiones (lastre opcional)",
  time: "Tiempo",
  distance_time: "Distancia y tiempo",
};

export const PR_LABEL: Record<PrType, string> = {
  weight: "Peso máximo",
  e1rm: "1RM estimado",
  reps: "Más repeticiones",
};
