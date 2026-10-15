"use client";

import { ChevronRight, Dumbbell, ListPlus, LoaderCircle, Play, Plus, Settings2, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { enqueue } from "@/lib/live/outbox";
import { openSession, sessionUrl, startWorkout } from "@/lib/live/start";
import { clearLocal, getActiveId, loadLocal } from "@/lib/live/workout";
import { muscleSummary, type RoutineWithItems } from "@/lib/routines";

export function useActiveSession(serverOpenId: string | null) {
  const [active, setActive] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const id = getActiveId();
    const local = id ? loadLocal(id) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (local && !local.ended_at) setActive({ id: local.id, name: local.name });
    else if (serverOpenId) setActive({ id: serverOpenId, name: "Sesión en curso" });
  }, [serverOpenId]);
  return active;
}

export function StartWorkout({ routines, openWorkoutId }: { routines: RoutineWithItems[]; openWorkoutId: string | null }) {
  const router = useRouter();
  const active = useActiveSession(openWorkoutId);
  const [starting, setStarting] = useState<string | null>(null);
  const [pending, setPending] = useState<RoutineWithItems | null | undefined>(undefined);

  const go = async (routine: RoutineWithItems | null) => {
    setStarting(routine?.id ?? "free");
    const id = await startWorkout(routine);
    openSession(router, id);
  };

  const request = (routine: RoutineWithItems | null) => {
    if (active) setPending(routine);
    else void go(routine);
  };

  const discardActiveAndStart = () => {
    if (active) {
      enqueue({ kind: "delete", table: "workouts", key: active.id });
      clearLocal(active.id);
    }
    const routine = pending ?? null;
    setPending(undefined);
    void go(routine);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[26px] font-bold tracking-tight">Entrenar</h1>

      {active && (
        <Link href={sessionUrl(active.id)} className="card flex items-center gap-3 border-up/40 p-3.5">
          <span className="grid size-11 place-items-center rounded-[14px] bg-up/15 text-up">
            <Play size={20} fill="currentColor" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[15px]">Continuar: {active.name}</b>
            <small className="text-xs text-sub">Tienes una sesión en curso</small>
          </span>
          <ChevronRight size={20} className="text-sub" />
        </Link>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold">Tus rutinas</h2>
          <Link href="/rutinas" className="inline-flex items-center gap-1 text-xs font-semibold text-sub">
            <Settings2 size={14} /> Gestionar
          </Link>
        </div>
        {routines.length === 0 && (
          <Link href="/rutinas/nueva" className="card flex items-center gap-3 p-4">
            <span className="grad grid size-11 place-items-center rounded-[14px]">
              <Dumbbell size={20} />
            </span>
            <span className="flex-1">
              <b className="block text-[15px]">Crea tu primera rutina</b>
              <small className="text-xs text-sub">Por ejemplo Push, Pull, Pierna</small>
            </span>
            <ChevronRight size={20} className="text-sub" />
          </Link>
        )}
        {routines.map((r) => (
          <div key={r.id} className="card flex items-center gap-3 p-3.5">
            <Link href={`/rutinas/${r.id}`} className="min-w-0 flex-1" aria-label={`Editar ${r.name}`}>
              <b className="block truncate font-display text-[16px] font-semibold">{r.name}</b>
              <small className="block truncate text-xs text-sub">
                {r.items.length === 0 ? "Sin ejercicios todavía" : `${r.items.length} ejercicios · ${muscleSummary(r)}`}
              </small>
            </Link>
            {r.items.length === 0 ? (
              <Link
                href={`/rutinas/${r.id}`}
                className="inline-flex h-11 flex-none items-center gap-1.5 rounded-[14px] bg-a1/14 px-3 text-[13px] font-semibold text-a1"
              >
                <ListPlus size={18} /> Añadir ejercicios
              </Link>
            ) : (
              <button
                onClick={() => request(r)}
                disabled={starting != null}
                className="grad grid size-11 flex-none place-items-center rounded-[14px] disabled:opacity-50"
                aria-label={`Empezar ${r.name}`}
              >
                {starting === r.id ? <LoaderCircle size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
              </button>
            )}
          </div>
        ))}
        {routines.length > 0 && (
          <Link
            href="/rutinas/nueva"
            className="flex h-14 items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-a1/40 text-[14px] font-semibold text-a1 transition-colors active:bg-a1/8"
          >
            <Plus size={19} /> Nueva rutina
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-[15px] font-semibold">Otras opciones</h2>
        <button onClick={() => request(null)} disabled={starting != null} className="card flex items-center gap-3 p-3.5 text-left">
          <span className="grid size-11 place-items-center rounded-[14px] bg-a1/14 text-a1">
            {starting === "free" ? <LoaderCircle size={20} className="animate-spin" /> : <Zap size={20} />}
          </span>
          <span className="flex-1">
            <b className="block text-[15px]">Entreno libre</b>
            <small className="text-xs text-sub">Empieza vacío y añade ejercicios sobre la marcha</small>
          </span>
          <ChevronRight size={20} className="text-sub" />
        </button>
        <Link href="/deportes/nuevo" className="card flex items-center gap-3 p-3.5">
          <span className="grid size-11 place-items-center rounded-[14px] bg-warm/15 text-warm">
            <Trophy size={20} />
          </span>
          <span className="flex-1">
            <b className="block text-[15px]">Registrar deporte</b>
            <small className="text-xs text-sub">Fútbol, running, baloncesto y más</small>
          </span>
          <ChevronRight size={20} className="text-sub" />
        </Link>
      </section>

      <Sheet open={pending !== undefined} onClose={() => setPending(undefined)} title="Tienes una sesión en curso">
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-sm text-sub">Termínala o descártala antes de empezar otra.</p>
          {active && (
            <Link href={sessionUrl(active.id)} className="btn grad w-full">
              Continuar la sesión
            </Link>
          )}
          <button onClick={discardActiveAndStart} className="btn w-full text-down">
            Descartarla y empezar nueva
          </button>
        </div>
      </Sheet>
    </div>
  );
}
