import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchRoutines } from "@/lib/routines";
import { requireUser } from "@/lib/supabase/server";
import { RoutineEditor } from "../routine-editor";

export const metadata: Metadata = { title: "Editar rutina" };

export default async function RoutinePage({ params }: PageProps<"/rutinas/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const routines = await fetchRoutines(supabase);
  if (id === "nueva") {
    return <RoutineEditor routine={null} nextPosition={routines.length} />;
  }
  const routine = routines.find((r) => r.id === id);
  if (!routine) notFound();
  return <RoutineEditor routine={routine} nextPosition={routines.length} />;
}
