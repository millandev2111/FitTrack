import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { latestWeight } from "@/lib/body";
import { requireUser } from "@/lib/supabase/server";
import { SportForm, type ActivityInput } from "../sport-form";

export const metadata: Metadata = { title: "Actividad" };

export default async function ActivityPage({ params }: PageProps<"/deportes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, weight] = await Promise.all([
    supabase.from("activities").select("id, sport, started_at, duration_minutes, distance_km, intensity, avg_heart_rate, details, notes").eq("id", id).maybeSingle(),
    latestWeight(supabase),
  ]);
  if (!data) notFound();
  const initial: ActivityInput = { ...data, distance_km: data.distance_km == null ? null : Number(data.distance_km) } as ActivityInput;
  return <SportForm initial={initial} weightKg={weight ?? 70} hasWeight={weight != null} />;
}
