"use client";

import { ArrowDown, ArrowUp, Link2, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton } from "@/components/back-button";
import { ExerciseThumb } from "@/components/exercise-photo";
import { ExercisePicker } from "@/components/exercise-picker";
import { Sheet } from "@/components/sheet";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/labels";
import type { RoutineItem, RoutineWithItems } from "@/lib/routines";
import { leaveTo } from "@/lib/nav-history";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";

type Item = Omit<RoutineItem, "routine_id">;

const REST_OPTIONS = [0, 45, 60, 75, 90, 120, 150, 180, 240];
const restLabel = (s: number | null) => (s == null ? "Auto" : s === 0 ? "Sin" : s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="grid size-7 place-items-center rounded-lg bg-surface-2" aria-label={`Menos ${label}`}>
        <Minus size={14} />
      </button>
      <span className="num w-7 text-center text-[15px] font-bold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="grid size-7 place-items-center rounded-lg bg-surface-2" aria-label={`Más ${label}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}

export function RoutineEditor({ routine, nextPosition }: { routine: RoutineWithItems | null; nextPosition: number }) {
  const router = useRouter();
  const [id] = useState(() => routine?.id ?? crypto.randomUUID());
  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [items, setItems] = useState<Item[]>(routine?.items ?? []);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (idx: number, patch: Partial<Item>) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const linked = (i: number) => items[i]?.superset_group != null && items[i].superset_group === items[i + 1]?.superset_group;
  // Une o separa un ejercicio del siguiente en una superserie.
  const toggleLink = (i: number) =>
    setItems((list) => {
      const next = list.map((it) => ({ ...it }));
      const a = next[i];
      const b = next[i + 1];
      if (a.superset_group != null && a.superset_group === b.superset_group) {
        b.superset_group = null;
        for (let k = i + 2; k < next.length && next[k].superset_group === a.superset_group; k++) next[k].superset_group = null;
        if (next[i - 1]?.superset_group !== a.superset_group) a.superset_group = null;
      } else {
        const group = a.superset_group ?? Math.max(0, ...next.map((it) => it.superset_group ?? 0)) + 1;
        a.superset_group = group;
        b.superset_group = group;
      }
      return next;
    });
  const move = (idx: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return list;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });

  const add = (exercises: Exercise[]) =>
    setItems((list) => [
      ...list,
      ...exercises.map((ex) => ({
        id: crypto.randomUUID(),
        exercise_id: ex.id,
        exercise: { id: ex.id, slug: ex.slug, name: ex.name, primary_muscle: ex.primary_muscle, equipment: ex.equipment, tracking: ex.tracking, default_rest_seconds: ex.default_rest_seconds },
        position: 0,
        target_sets: 3,
        rep_min: ex.tracking === "time" || ex.tracking === "distance_time" ? null : 8,
        rep_max: ex.tracking === "time" || ex.tracking === "distance_time" ? null : 12,
        rest_seconds: null,
        superset_group: null,
        notes: null,
      })),
    ]);

  const save = async () => {
    if (!name.trim()) {
      setError("Ponle un nombre a la rutina.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error: e1 } = await supabase
        .from("routines")
        .upsert({ id, name: name.trim(), description: description.trim() || null, position: routine?.position ?? nextPosition });
      if (e1) throw e1;
      const keep = items.map((it) => it.id);
      const removed = (routine?.items ?? []).filter((it) => !keep.includes(it.id)).map((it) => it.id);
      if (removed.length) {
        const { error: e2 } = await supabase.from("routine_exercises").delete().in("id", removed);
        if (e2) throw e2;
      }
      if (items.length) {
        const { error: e3 } = await supabase.from("routine_exercises").upsert(
          items.map((it, i) => ({
            id: it.id,
            routine_id: id,
            exercise_id: it.exercise_id,
            position: i,
            target_sets: it.target_sets,
            rep_min: it.rep_min,
            rep_max: it.rep_max,
            rest_seconds: it.rest_seconds,
            superset_group: it.superset_group,
            notes: it.notes,
          })),
        );
        if (e3) throw e3;
      }
      leaveTo(router, "/rutinas");
    } catch {
      setError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    const { error: e } = await createClient().from("routines").delete().eq("id", id);
    if (e) {
      setError("No se pudo eliminar. Revisa tu conexión.");
      setSaving(false);
      setConfirmDelete(false);
      return;
    }
    leaveTo(router, "/rutinas");
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <BackButton fallback="/rutinas" />
        {routine && (
          <button onClick={() => setConfirmDelete(true)} className="icon-btn text-down" aria-label="Eliminar rutina">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la rutina"
          aria-label="Nombre de la rutina"
          className="bg-transparent font-display text-[26px] font-bold tracking-tight outline-none placeholder:text-sub/50"
          maxLength={60}
        />
        <label className="field h-11">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional): pecho, hombro y tríceps" maxLength={300} aria-label="Descripción" />
        </label>
      </div>

      <ul className="flex flex-col gap-2.5">
        {items.map((it, i) => {
          const repsBased = it.exercise.tracking === "weight_reps" || it.exercise.tracking === "bodyweight_reps";
          return (
            <li key={it.id} className="flex flex-col gap-2.5">
              <div className={`card flex flex-col gap-3 p-3.5 ${linked(i) || linked(i - 1) ? "border-a1/50" : ""}`}>
                <div className="flex items-start gap-2">
                  <span className="relative flex-none">
                    <ExerciseThumb slug={it.exercise.slug} size={44} />
                    <span className="num absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-md bg-a1 text-[10px] font-bold text-white">{i + 1}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[15px]">{it.exercise.name}</b>
                    <small className="text-xs text-sub">
                      {MUSCLE_LABEL[it.exercise.primary_muscle]} · {EQUIPMENT_LABEL[it.exercise.equipment]}
                    </small>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg bg-surface-2 disabled:opacity-30" aria-label="Mover arriba">
                      <ArrowUp size={15} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="grid size-8 place-items-center rounded-lg bg-surface-2 disabled:opacity-30" aria-label="Mover abajo">
                      <ArrowDown size={15} />
                    </button>
                    <button onClick={() => setItems((l) => l.filter((_, k) => k !== i))} className="grid size-8 place-items-center rounded-lg bg-down/12 text-down" aria-label="Quitar ejercicio">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-sub">
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-2/60 py-2">
                    Series
                    <Stepper label="series" value={it.target_sets} min={1} max={10} onChange={(v) => update(i, { target_sets: v })} />
                  </div>
                  {repsBased ? (
                    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-2/60 py-2">
                      Reps
                      <div className="flex items-center gap-0.5">
                        <select value={it.rep_min ?? 8} onChange={(e) => update(i, { rep_min: Number(e.target.value), rep_max: Math.max(Number(e.target.value), it.rep_max ?? 0) })} className="num appearance-none bg-transparent text-center text-[15px] font-bold text-fg" aria-label="Repeticiones mínimas">
                          {Array.from({ length: 30 }, (_, k) => k + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <span className="text-fg">–</span>
                        <select value={it.rep_max ?? 12} onChange={(e) => update(i, { rep_max: Number(e.target.value), rep_min: Math.min(Number(e.target.value), it.rep_min ?? 99) })} className="num appearance-none bg-transparent text-center text-[15px] font-bold text-fg" aria-label="Repeticiones máximas">
                          {Array.from({ length: 30 }, (_, k) => k + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-2/60 py-2">
                    Descanso
                    <select
                      value={it.rest_seconds ?? ""}
                      onChange={(e) => update(i, { rest_seconds: e.target.value === "" ? null : Number(e.target.value) })}
                      className="num appearance-none bg-transparent text-center text-[15px] font-bold text-fg"
                      aria-label="Descanso"
                    >
                      <option value="">Auto</option>
                      {REST_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {restLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {i < items.length - 1 && (
                <button
                  onClick={() => toggleLink(i)}
                  aria-pressed={linked(i)}
                  className={`mx-auto -my-1 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold ${
                    linked(i) ? "bg-a1 text-white" : "border border-dashed border-line text-sub"
                  }`}
                >
                  <Link2 size={14} /> {linked(i) ? "Superserie · toca para separar" : "Superserie con el siguiente"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button onClick={() => setPicker(true)} className="btn btn-ghost w-full">
        <Plus size={18} /> Añadir ejercicios
      </button>

      {error && <p className="text-center text-sm text-down">{error}</p>}

      <div className="fixed inset-x-4 z-40 mx-auto max-w-[430px]" style={{ bottom: "max(env(safe-area-inset-bottom), 14px)" }}>
        <button onClick={save} disabled={saving} className="btn grad w-full shadow-[0_14px_30px_-12px_var(--a1)]">
          {saving ? <LoaderCircle className="animate-spin" size={20} /> : "Guardar rutina"}
        </button>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={add} exclude={items.map((i) => i.exercise_id)} />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="¿Eliminar rutina?">
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-sm text-sub">Tus entrenamientos pasados con esta rutina se conservan.</p>
          <button onClick={remove} className="btn w-full bg-down text-white">
            Eliminar
          </button>
          <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost w-full">
            Cancelar
          </button>
        </div>
      </Sheet>
    </div>
  );
}
