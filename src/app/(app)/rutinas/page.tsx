import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { fetchRoutines, muscleSummary } from "@/lib/routines";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rutinas" };

export default async function RoutinesPage() {
  const { supabase } = await requireUser();
  const routines = await fetchRoutines(supabase);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <BackButton fallback="/entrenar" />
        <Link href="/rutinas/nueva" className="btn grad h-10 rounded-[14px] px-3.5 text-sm">
          <Plus size={18} /> Nueva rutina
        </Link>
      </div>
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight">Rutinas</h1>
        <p className="text-sm text-sub">Plantillas para empezar una sesión con un toque.</p>
      </div>
      {routines.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">Crea tu primera rutina</p>
          <p className="mt-1 text-sm text-sub">Por ejemplo Push A, Pull A y Pierna.</p>
          <Link href="/rutinas/nueva" className="btn grad mt-5">
            <Plus size={18} /> Nueva rutina
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {routines.map((r) => (
            <li key={r.id}>
              <Link href={`/rutinas/${r.id}`} className="card flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-display text-[16px] font-semibold">{r.name}</b>
                  <small className="block truncate text-xs text-sub">
                    {r.items.length} ejercicios{r.items.length ? ` · ${muscleSummary(r)}` : ""}
                  </small>
                </span>
                <ChevronRight size={20} className="text-sub" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
