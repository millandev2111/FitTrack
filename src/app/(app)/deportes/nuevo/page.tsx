import type { Metadata } from "next";
import { latestWeight } from "@/lib/body";
import { requireUser } from "@/lib/supabase/server";
import { SportForm } from "../sport-form";

export const metadata: Metadata = { title: "Registrar actividad" };

export default async function NewActivityPage() {
  const { supabase } = await requireUser();
  const weight = await latestWeight(supabase);
  return <SportForm initial={null} weightKg={weight ?? 70} hasWeight={weight != null} />;
}
