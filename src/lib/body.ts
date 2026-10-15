import type { SupabaseClient } from "@supabase/supabase-js";

/** Último peso corporal registrado (kg) o null. */
export async function latestWeight(supabase: SupabaseClient): Promise<number | null> {
  const { data } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .order("measured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg != null ? Number(data.weight_kg) : null;
}

export type MetricRow = {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
};

export const MEASURES: { key: keyof MetricRow; label: string }[] = [
  { key: "neck_cm", label: "Cuello" },
  { key: "chest_cm", label: "Pecho" },
  { key: "waist_cm", label: "Cintura" },
  { key: "hips_cm", label: "Cadera" },
  { key: "arm_cm", label: "Brazo" },
  { key: "thigh_cm", label: "Muslo" },
  { key: "calf_cm", label: "Pantorrilla" },
];
