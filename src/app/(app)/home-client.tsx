"use client";

import { ChevronRight, Dumbbell, ListChecks, LoaderCircle, Play, Plus, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openSession, sessionUrl, startWorkout } from "@/lib/live/start";
import { muscleSummary, type RoutineWithItems } from "@/lib/routines";
import { useActiveSession } from "./entrenar/start-workout";

export function ActiveBanner({ openWorkoutId }: { openWorkoutId: string | null }) {
  const active = useActiveSession(openWorkoutId);
  if (!active) return null;
  return (
    <Link href={sessionUrl(active.id)} className="pop-in card flex items-center gap-3 border-up/40 p-3.5">
      <span className="relative grid size-11 place-items-center rounded-[14px] bg-up/15 text-up">
        <span className="absolute top-1.5 right-1.5 size-2 animate-pulse rounded-full bg-up" />
        <Timer size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px]">{active.name}</b>
        <small className="text-xs text-sub">Sesión en curso · toca para continuar</small>
      </span>
      <ChevronRight size={20} className="text-sub" />
    </Link>
  );
}

export function TodayCard({ routine, hasActive }: { routine: RoutineWithItems | null; hasActive: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  if (!routine) {
    return (
      <Link href="/rutinas/nueva" className="grad relative flex flex-col gap-1 overflow-hidden rounded-3xl p-4">
        <Dumbbell size={110} className="absolute -top-3 -right-4 rotate-[-25deg] opacity-15" />
        <span className="text-[10.5px] font-bold tracking-[.12em] uppercase opacity-80">Empieza aquí</span>
        <span className="font-display text-[24px] font-bold tracking-tight">Crea tu primera rutina</span>
        <span className="text-sm opacity-90">Elige ejercicios, series y repeticiones.</span>
      </Link>
    );
  }

  const start = async () => {
    if (hasActive) return router.push("/entrenar");
    setStarting(true);
    const id = await startWorkout(routine);
    openSession(router, id);
  };

  return (
    <div className="grad relative flex flex-col gap-0.5 overflow-hidden rounded-3xl p-4">
      <Dumbbell size={120} className="pointer-events-none absolute -top-4 -right-5 rotate-[-25deg] opacity-15" />
      <span className="text-[10.5px] font-bold tracking-[.12em] uppercase opacity-80">Hoy toca</span>
      <span className="font-display text-[26px] font-bold tracking-tight">{routine.name}</span>
      <span className="text-sm opacity-90">{muscleSummary(routine) || "Sin ejercicios"}</span>
      <span className="mt-2.5 inline-flex items-center gap-1 text-xs opacity-90">
        <ListChecks size={15} /> {routine.items.length} ejercicios
      </span>
      <button
        onClick={start}
        disabled={starting || routine.items.length === 0}
        className="absolute right-3.5 bottom-3.5 grid size-12 place-items-center rounded-2xl bg-white text-[#16182c] transition-transform active:scale-95"
        aria-label={`Empezar ${routine.name}`}
      >
        {starting ? <LoaderCircle size={22} className="animate-spin" /> : <Play size={22} fill="currentColor" />}
      </button>
    </div>
  );
}

/** Todas tus rutinas a mano: deslizas y empiezas la que quieras con un toque. */
export function MyRoutines({ routines, hasActive }: { routines: RoutineWithItems[]; hasActive: boolean }) {
  const router = useRouter();
  const active = useActiveSession(null);
  const [starting, setStarting] = useState<string | null>(null);

  const start = async (routine: RoutineWithItems) => {
    // Con una sesión abierta, Entrenar te pregunta si continuarla o descartarla.
    if (hasActive || active) return router.push("/entrenar");
    setStarting(routine.id);
    const id = await startWorkout(routine);
    openSession(router, id);
  };

  return (
    <section className="flex flex-col gap-2.5" aria-label="Mis rutinas">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-semibold">Mis rutinas</h2>
        <Link href="/rutinas" className="text-xs text-sub">
          Ver todas
        </Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {routines.map((r) => (
          <div key={r.id} className="card flex w-[min(68vw,240px)] flex-none snap-start flex-col gap-3 p-3.5">
            <Link href={`/rutinas/${r.id}`} className="min-w-0" aria-label={`Editar ${r.name}`}>
              <b className="block truncate font-display text-[16px] font-semibold">{r.name}</b>
              <small className="block truncate text-xs text-sub">{r.items.length ? muscleSummary(r) : "Sin ejercicios todavía"}</small>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-sub">
                <ListChecks size={14} /> {r.items.length} ejercicios
              </span>
              {r.items.length === 0 ? (
                <Link href={`/rutinas/${r.id}`} className="rounded-xl bg-a1/14 px-2.5 py-1.5 text-xs font-semibold text-a1">
                  Añadir
                </Link>
              ) : (
                <button
                  onClick={() => start(r)}
                  disabled={starting != null}
                  className="grad grid size-10 place-items-center rounded-[13px] transition-transform active:scale-95 disabled:opacity-60"
                  aria-label={`Empezar ${r.name}`}
                >
                  {starting === r.id ? <LoaderCircle size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                </button>
              )}
            </div>
          </div>
        ))}
        <Link
          href="/rutinas/nueva"
          className="flex w-28 flex-none snap-start flex-col items-center justify-center gap-1.5 rounded-[22px] border-[1.5px] border-dashed border-a1/40 text-[13px] font-semibold text-a1"
        >
          <Plus size={20} /> Nueva
        </Link>
      </div>
    </section>
  );
}
