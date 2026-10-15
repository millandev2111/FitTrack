"use client";

import { ChevronRight, Dumbbell, ListChecks, LoaderCircle, Play, Timer } from "lucide-react";
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
