"use client";

import { ChevronDown, CloudOff, LoaderCircle, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExercisePicker } from "@/components/exercise-picker";
import { useProfile } from "@/components/profile-provider";
import { Sheet } from "@/components/sheet";
import { PR_LABEL } from "@/lib/labels";
import { primeAudio, useNow, useSyncStatus, useWakeLock } from "@/lib/hooks";
import { enqueue, onSynced } from "@/lib/live/outbox";
import {
  clearLocal,
  exerciseRow,
  fetchPrevious,
  initialSets,
  loadFromServer,
  loadLocal,
  newSet,
  saveLocal,
  setRow,
  workoutRow,
  type LiveExercise,
  type LiveSet,
  type LiveWorkout,
} from "@/lib/live/workout";
import { willReplace } from "@/lib/nav-history";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/text";
import type { Exercise, PersonalRecord } from "@/lib/types";
import { formatNumber, formatWeight } from "@/lib/units";
import { ExerciseCard, type CardActions, type SupersetInfo } from "./exercise-card";
import { RestBar, type RestState } from "./rest-bar";
import { SessionSummary } from "./session-summary";

const REST_KEY = "ft-rest";

export type PrToast = { key: string; exercise: string; text: string };

export function LiveSession() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const profile = useProfile();
  const unit = profile.unit_system;
  const [workout, setWorkout] = useState<LiveWorkout | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const ref = useRef<LiveWorkout | null>(null);
  const [rest, setRestState] = useState<RestState>(null);
  const [picker, setPicker] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [toasts, setToasts] = useState<PrToast[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const sync = useSyncStatus();
  const now = useNow(1000);

  useWakeLock(state === "ready" && !workout?.ended_at);

  // El id sale de la URL real del navegador (no del HTML guardado).
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("id");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromUrl) setId(fromUrl);
    else setState("missing");
  }, []);

  // Carga: primero el teléfono, si no existe, Supabase.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const local = loadLocal(id);
    if (local) {
      ref.current = local;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkout(local);
      setState("ready");
    } else {
      loadFromServer(createClient(), id).then((w) => {
        if (cancelled) return;
        if (!w) return setState("missing");
        ref.current = w;
        if (!w.ended_at) saveLocal(w);
        setWorkout(w);
        setState("ready");
      });
    }
    try {
      const saved = JSON.parse(localStorage.getItem(REST_KEY) ?? "null") as RestState;
      if (saved && saved.endsAt > Date.now()) setRestState(saved);
    } catch {}
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setRest = useCallback((r: RestState) => {
    setRestState(r);
    try {
      if (r) localStorage.setItem(REST_KEY, JSON.stringify(r));
      else localStorage.removeItem(REST_KEY);
    } catch {}
  }, []);

  const commit = useCallback((next: LiveWorkout) => {
    ref.current = next;
    setWorkout(next);
    saveLocal(next);
  }, []);

  // Récords: la base de datos los detecta al guardar cada serie.
  useEffect(() => {
    return onSynced(async (event) => {
      if (event.table !== "sets" || !event.row?.completed) return;
      const w = ref.current;
      const ex = w?.exercises.find((e) => e.sets.some((s) => s.id === event.key));
      if (!ex) return;
      const { data } = await createClient().from("personal_records").select("*").eq("set_id", event.key);
      const records = (data ?? []) as PersonalRecord[];
      setPrs((all) => [...all.filter((p) => p.set_id !== event.key), ...records]);
      if (records.length === 0) return;
      const best = records.find((r) => r.type === "weight") ?? records.find((r) => r.type === "e1rm") ?? records[0];
      const text =
        best.type === "reps"
          ? `${best.reps} reps con ${formatWeight(best.weight_kg, unit)} (antes ${formatNumber(best.previous_value, 0)})`
          : `${PR_LABEL[best.type]}: ${formatWeight(best.value, unit)} (antes ${formatWeight(best.previous_value, unit)})`;
      const toast = { key: `${event.key}-${Date.now()}`, exercise: ex.exercise.name, text };
      setToasts((t) => [...t, toast]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.key !== toast.key)), 6000);
    });
  }, [unit]);

  // ----- Acciones -----

  const mutateExercise = (exIdx: number, fn: (e: LiveExercise) => LiveExercise) => {
    const w = ref.current!;
    const exercises = w.exercises.map((e, i) => (i === exIdx ? fn(e) : e));
    commit({ ...w, exercises });
    return exercises[exIdx];
  };

  const restFor = (e: LiveExercise) => e.rest_seconds ?? e.exercise.default_rest_seconds ?? profile.default_rest_seconds;

  const actionsFor = (exIdx: number): CardActions => ({
    updateSet: (setIdx, patch) => {
      const e = mutateExercise(exIdx, (ex) => ({ ...ex, sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)) }));
      const s = e.sets[setIdx];
      if (s.completed) enqueue({ kind: "upsert", table: "sets", row: setRow(e.id, s) });
    },
    toggleSet: (setIdx) => {
      primeAudio();
      const current = ref.current!.exercises[exIdx].sets[setIdx];
      const tracking = ref.current!.exercises[exIdx].exercise.tracking;
      if (!current.completed) {
        const prev = ref.current!.exercises[exIdx].previous?.[setIdx];
        // Si dejaste la celda vacía, se usa lo de la vez pasada (lo que ves en gris).
        const filled: Partial<LiveSet> = {
          weight_kg: current.weight_kg ?? (tracking === "weight_reps" ? prev?.weight_kg ?? null : current.weight_kg),
          reps: current.reps ?? prev?.reps ?? null,
          duration_seconds: current.duration_seconds ?? prev?.duration_seconds ?? null,
          distance_m: current.distance_m ?? prev?.distance_m ?? null,
        };
        const hasData =
          tracking === "time" ? filled.duration_seconds != null : tracking === "distance_time" ? filled.distance_m != null || filled.duration_seconds != null : filled.reps != null && filled.reps > 0;
        if (!hasData) return;
        const e = mutateExercise(exIdx, (ex) => ({
          ...ex,
          sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, ...filled, completed: true, performed_at: new Date().toISOString() } : s)),
        }));
        enqueue({ kind: "upsert", table: "sets", row: setRow(e.id, e.sets[setIdx]) });
        const all = ref.current!.exercises;
        const nextInGroup = e.superset_group != null && all[exIdx + 1]?.superset_group === e.superset_group;
        // En una superserie pasas directo al siguiente ejercicio; el descanso va al final del grupo.
        const seconds = nextInGroup ? 0 : restFor(e);
        if (seconds > 0) setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
      } else {
        mutateExercise(exIdx, (ex) => ({ ...ex, sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, completed: false, performed_at: null } : s)) }));
        enqueue({ kind: "delete", table: "sets", key: current.id });
        setPrs((all) => all.filter((p) => p.set_id !== current.id));
      }
    },
    addSet: () => {
      mutateExercise(exIdx, (ex) => {
        const last = ex.sets[ex.sets.length - 1];
        const base = last ? { ...last, set_type: last.set_type === "warmup" ? ("normal" as const) : last.set_type } : undefined;
        return { ...ex, sets: [...ex.sets, newSet(ex.sets.length, base)] };
      });
    },
    removeSet: (setIdx) => {
      const before = ref.current!.exercises[exIdx];
      const removed = before.sets[setIdx];
      const e = mutateExercise(exIdx, (ex) => ({ ...ex, sets: ex.sets.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, position: i })) }));
      if (removed.completed) enqueue({ kind: "delete", table: "sets", key: removed.id });
      e.sets.forEach((s, i) => {
        if (s.completed && i >= setIdx) enqueue({ kind: "upsert", table: "sets", row: setRow(e.id, s) });
      });
    },
    removeExercise: () => {
      const w = ref.current!;
      const removed = w.exercises[exIdx];
      const exercises = w.exercises.filter((_, i) => i !== exIdx).map((e, i) => ({ ...e, position: i }));
      commit({ ...w, exercises });
      enqueue({ kind: "delete", table: "workout_exercises", key: removed.id });
      exercises.forEach((e, i) => i >= exIdx && enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, e) }));
    },
    move: (dir) => {
      const w = ref.current!;
      const target = exIdx + dir;
      if (target < 0 || target >= w.exercises.length) return;
      const exercises = [...w.exercises];
      [exercises[exIdx], exercises[target]] = [exercises[target], exercises[exIdx]];
      const reindexed = exercises.map((e, i) => ({ ...e, position: i }));
      commit({ ...w, exercises: reindexed });
      [exIdx, target].forEach((i) => enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, reindexed[i]) }));
    },
    applyWeight: (weightKg) => {
      mutateExercise(exIdx, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) => (s.set_type === "warmup" || s.completed ? s : { ...s, weight_kg: weightKg })),
      }));
    },
    setNotes: (notes) => {
      const e = mutateExercise(exIdx, (ex) => ({ ...ex, notes }));
      enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(ref.current!.id, e) });
    },
    linkNext: () => {
      const w = ref.current!;
      const cur = w.exercises[exIdx];
      const next = w.exercises[exIdx + 1];
      if (!next) return;
      const group = cur.superset_group ?? next.superset_group ?? Math.max(0, ...w.exercises.map((e) => e.superset_group ?? 0)) + 1;
      const exercises = w.exercises.map((e, i) => (i === exIdx || i === exIdx + 1 ? { ...e, superset_group: group } : e));
      commit({ ...w, exercises });
      [exIdx, exIdx + 1].forEach((i) => enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, exercises[i]) }));
    },
    unlink: () => {
      const w = ref.current!;
      const group = w.exercises[exIdx].superset_group;
      let exercises = w.exercises.map((e, i) => (i === exIdx ? { ...e, superset_group: null } : e));
      // Un grupo de un solo ejercicio deja de ser superserie.
      if (group != null && exercises.filter((e) => e.superset_group === group).length < 2) {
        exercises = exercises.map((e) => (e.superset_group === group ? { ...e, superset_group: null } : e));
      }
      commit({ ...w, exercises });
      exercises.forEach((e, i) => {
        if (w.exercises[i].superset_group !== e.superset_group) enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, e) });
      });
    },
  });

  const supersetInfo = (exercises: LiveExercise[], i: number): SupersetInfo => {
    const g = exercises[i].superset_group;
    if (g == null) return null;
    const prevSame = exercises[i - 1]?.superset_group === g;
    const nextSame = exercises[i + 1]?.superset_group === g;
    if (!prevSame && !nextSame) return null;
    const groups = [...new Set(exercises.map((e) => e.superset_group).filter((x): x is number => x != null))];
    const label = `Superserie ${String.fromCharCode(65 + Math.max(0, groups.indexOf(g)))}`;
    return { label, position: !prevSame ? "first" : !nextSame ? "last" : "middle" };
  };

  const addExercises = async (list: Exercise[]) => {
    const w = ref.current!;
    const start = w.exercises.length;
    const added: LiveExercise[] = list.map((ex, i) => ({
      id: crypto.randomUUID(),
      exercise: { id: ex.id, slug: ex.slug, name: ex.name, primary_muscle: ex.primary_muscle, equipment: ex.equipment, tracking: ex.tracking, default_rest_seconds: ex.default_rest_seconds },
      position: start + i,
      notes: null,
      target_sets: 3,
      rep_min: null,
      rep_max: null,
      rest_seconds: null,
      superset_group: null,
      sets: initialSets(3, null),
      previous: null,
      previous_at: null,
    }));
    commit({ ...w, exercises: [...w.exercises, ...added] });
    added.forEach((e) => enqueue({ kind: "upsert", table: "workout_exercises", row: exerciseRow(w.id, e) }));

    // Trae lo de la vez pasada (si hay conexión) y precarga las series.
    try {
      const prev = await fetchPrevious(createClient(), list.map((e) => e.id), w.exercises.map((e) => e.id));
      const cur = ref.current!;
      commit({
        ...cur,
        exercises: cur.exercises.map((e) => {
          if (!added.some((a) => a.id === e.id)) return e;
          const p = prev[e.exercise.id];
          if (!p) return e;
          const untouched = e.sets.every((s) => !s.completed && s.weight_kg == null && s.reps == null);
          return { ...e, previous: p.sets, previous_at: p.at, sets: untouched ? initialSets(3, p.sets) : e.sets };
        }),
      });
    } catch {}
  };

  const finish = () => {
    const w = ref.current!;
    const ended = { ...w, ended_at: new Date().toISOString(), notes: workoutNotes.trim() || w.notes || null };
    w.exercises.filter((e) => !e.sets.some((s) => s.completed)).forEach((e) => enqueue({ kind: "delete", table: "workout_exercises", key: e.id }));
    const kept = { ...ended, exercises: ended.exercises.filter((e) => e.sets.some((s) => s.completed)) };
    enqueue({ kind: "upsert", table: "workouts", row: workoutRow(kept) });
    setRest(null);
    clearLocal(w.id);
    ref.current = kept;
    setWorkout(kept);
    setFinishSheet(false);
    router.refresh();
  };

  const discard = () => {
    const w = ref.current!;
    enqueue({ kind: "delete", table: "workouts", key: w.id });
    setRest(null);
    clearLocal(w.id);
    willReplace();
    router.replace("/");
    router.refresh();
  };

  // ----- Render -----

  if (state === "loading") {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-sub">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }
  if (state === "missing" || !workout) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sub">No encontramos esta sesión. Puede que la hayas descartado.</p>
        <Link href="/" className="btn grad">
          Ir al inicio
        </Link>
      </div>
    );
  }
  if (workout.ended_at) return <SessionSummary workout={workout} prs={prs} unit={unit} />;

  const completedExercises = workout.exercises.filter((e) => e.sets.length > 0 && e.sets.every((s) => s.completed)).length;
  const anyCompleted = workout.exercises.some((e) => e.sets.some((s) => s.completed));

  return (
    <div className="flex flex-col gap-3 pb-24">
      <header className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-bg/85 px-4 pt-1 pb-2.5 backdrop-blur-md">
        <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5">
          <Link href="/" className="icon-btn" aria-label="Minimizar sesión">
            <ChevronDown size={22} />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate font-display text-[15px] font-semibold">{workout.name}</h1>
            <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold">
              {sync.offline ? (
                <span className="inline-flex items-center gap-1 text-same">
                  <CloudOff size={13} /> Sin conexión · {sync.pending} por subir
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-up">
                  <span className="size-1.5 rounded-full bg-up" /> En curso · <span className="num">{formatDuration(now - Date.parse(workout.started_at))}</span>
                </span>
              )}
            </p>
          </div>
          <button onClick={() => setFinishSheet(true)} className="h-[34px] rounded-xl bg-down/15 px-3 text-xs font-bold text-down">
            Terminar
          </button>
        </div>
        {workout.exercises.length > 0 && (
          <div className="mt-2.5 flex gap-1" aria-label={`${completedExercises} de ${workout.exercises.length} ejercicios completos`}>
            {workout.exercises.map((e) => (
              <i key={e.id} className={`h-1 flex-1 rounded-full ${e.sets.length > 0 && e.sets.every((s) => s.completed) ? "grad" : "bg-surface-2"}`} />
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className="pop-in relative flex items-center gap-2.5 overflow-hidden rounded-[18px] bg-gradient-to-br from-warm to-gold px-3 py-2.5 text-[#2a1300]">
            <Trophy size={24} className="flex-none" />
            <div className="min-w-0">
              <b className="block font-display text-[13px]">¡Nuevo récord! {t.exercise}</b>
              <small className="text-[11.5px] font-semibold opacity-80">{t.text}</small>
            </div>
          </div>
        ))}
      </div>

      {workout.exercises.length === 0 && (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">Añade tu primer ejercicio</p>
          <p className="text-sm text-sub">Busca en el catálogo o crea uno propio.</p>
        </div>
      )}

      {workout.exercises.map((item, i) => (
        <ExerciseCard
          key={item.id}
          item={item}
          index={i}
          total={workout.exercises.length}
          unit={unit}
          actions={actionsFor(i)}
          superset={supersetInfo(workout.exercises, i)}
          canLinkNext={i < workout.exercises.length - 1 && (item.superset_group == null || workout.exercises[i + 1].superset_group !== item.superset_group)}
        />
      ))}

      <button onClick={() => setPicker(true)} className="btn btn-ghost w-full">
        <Plus size={18} /> Añadir ejercicio
      </button>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addExercises} exclude={workout.exercises.map((e) => e.exercise.id)} />

      <RestBar rest={rest} onChange={setRest} />

      <Sheet open={finishSheet} onClose={() => setFinishSheet(false)} title="¿Terminar entrenamiento?">
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-sm text-sub">
            {anyCompleted
              ? "Se guardan las series que marcaste como completadas. Las vacías se descartan."
              : "Todavía no has completado ninguna serie. Si terminas ahora, no se guardará nada."}
          </p>
          {anyCompleted && (
            <label className="field h-auto items-start py-3">
              <textarea
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Notas del entrenamiento (opcional): dormí poco, buena energía…"
                aria-label="Notas del entrenamiento"
                className="resize-none"
              />
            </label>
          )}
          {anyCompleted && (
            <button onClick={finish} className="btn grad w-full">
              Terminar y guardar
            </button>
          )}
          <button onClick={() => setFinishSheet(false)} className="btn btn-ghost w-full">
            Seguir entrenando
          </button>
          <button onClick={discard} className="btn w-full text-down">
            Descartar entrenamiento
          </button>
        </div>
      </Sheet>
    </div>
  );
}
