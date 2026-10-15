"use client";

import { Check, LoaderCircle, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cachedExercises, createExercise, fetchExercises } from "@/lib/exercises-cache";
import { EQUIPMENT_LABEL, MUSCLE_FAMILY, MUSCLE_LABEL, TRACKING_LABEL } from "@/lib/labels";
import { normalize } from "@/lib/text";
import type { Equipment, Exercise, MuscleGroup, Tracking } from "@/lib/types";
import { ExerciseThumb } from "./exercise-photo";
import { useProfile } from "./profile-provider";
import { Sheet } from "./sheet";

export function useExercises() {
  const [list, setList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(cachedExercises());
    fetchExercises().then((data) => {
      setList(data);
      setLoading(false);
    });
  }, []);
  return { list, setList, loading };
}

export function ExerciseFilter({
  list,
  query,
  setQuery,
  family,
  setFamily,
}: {
  list: Exercise[];
  query: string;
  setQuery: (q: string) => void;
  family: string | null;
  setFamily: (f: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="field h-11">
        <Search size={18} aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Buscar entre ${list.length} ejercicios`} aria-label="Buscar ejercicio" />
      </label>
      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {[null, ...Object.keys(MUSCLE_FAMILY)].map((key) => (
          <button
            key={key ?? "all"}
            onClick={() => setFamily(key)}
            className={`h-8 flex-none rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
              family === key ? "grad" : "bg-surface text-sub"
            }`}
          >
            {key ? MUSCLE_FAMILY[key].label : "Todos"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function filterExercises(list: Exercise[], query: string, family: string | null) {
  const q = normalize(query.trim());
  const muscles = family ? MUSCLE_FAMILY[family].muscles : null;
  return list.filter(
    (e) => (!muscles || muscles.includes(e.primary_muscle)) && (!q || normalize(e.name).includes(q) || normalize(MUSCLE_LABEL[e.primary_muscle]).includes(q)),
  );
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  multiple = true,
  exclude = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercises: Exercise[]) => void;
  multiple?: boolean;
  exclude?: string[];
}) {
  const { list, setList } = useExercises();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => filterExercises(list, query, family), [list, query, family]);

  const close = () => {
    setSelected([]);
    setQuery("");
    setCreating(false);
    onClose();
  };

  const toggle = (ex: Exercise) => {
    if (!multiple) {
      onPick([ex]);
      close();
      return;
    }
    setSelected((s) => (s.includes(ex.id) ? s.filter((id) => id !== ex.id) : [...s, ex.id]));
  };

  const confirm = () => {
    const byId = new Map(list.map((e) => [e.id, e]));
    onPick(selected.map((id) => byId.get(id)!).filter(Boolean));
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={creating ? "Nuevo ejercicio" : "Añadir ejercicio"} tall>
      {creating ? (
        <CreateExerciseForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(ex) => {
            setList((l) => [...l, ex].sort((a, b) => a.name.localeCompare(b.name)));
            setCreating(false);
            if (multiple) setSelected((s) => [...s, ex.id]);
            else {
              onPick([ex]);
              close();
            }
          }}
        />
      ) : (
        <>
          <ExerciseFilter list={list} query={query} setQuery={setQuery} family={family} setFamily={setFamily} />
          <ul className="mt-2 flex flex-col">
            {filtered.map((ex) => {
              const on = selected.includes(ex.id);
              const disabled = exclude.includes(ex.id);
              return (
                <li key={ex.id}>
                  <button
                    disabled={disabled}
                    onClick={() => toggle(ex)}
                    className="flex w-full items-center gap-3 border-b border-line py-2.5 text-left disabled:opacity-40"
                  >
                    <ExerciseThumb slug={ex.slug} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{ex.name}</span>
                      <span className="text-xs text-sub">
                        {MUSCLE_LABEL[ex.primary_muscle]} · {EQUIPMENT_LABEL[ex.equipment]}
                        {ex.user_id ? " · Tuyo" : ""}
                      </span>
                    </span>
                    {multiple && (
                      <span className={`grid size-7 flex-none place-items-center rounded-[10px] ${on ? "grad" : "bg-surface-2"}`}>
                        {on && <Check size={16} strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setCreating(true)} className="my-3 flex items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line py-3 text-sm font-semibold text-sub">
            <Plus size={16} /> Crear un ejercicio {query ? `“${query}”` : "nuevo"}
          </button>
          {multiple && selected.length > 0 && (
            <div className="sticky bottom-0 -mx-5 bg-bg px-5 pt-2">
              <button onClick={confirm} className="btn grad w-full">
                Añadir {selected.length} {selected.length === 1 ? "ejercicio" : "ejercicios"}
              </button>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABEL) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABEL) as Equipment[];
const TRACKING_OPTIONS = Object.keys(TRACKING_LABEL) as Tracking[];

function CreateExerciseForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (ex: Exercise) => void;
}) {
  const profile = useProfile();
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [tracking, setTracking] = useState<Tracking>("weight_reps");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Escribe un nombre para el ejercicio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ex = await createExercise({ user_id: profile.id, name: name.trim(), primary_muscle: muscle, equipment, tracking });
      onCreated(ex);
    } catch {
      setError("No se pudo crear. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-sub">
        Nombre
        <span className="field">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Press de banca en máquina" autoFocus />
        </span>
      </label>
      <SelectField label="Músculo principal" value={muscle} onChange={(v) => setMuscle(v as MuscleGroup)} options={MUSCLE_OPTIONS.map((m) => [m, MUSCLE_LABEL[m]])} />
      <SelectField label="Equipo" value={equipment} onChange={(v) => setEquipment(v as Equipment)} options={EQUIPMENT_OPTIONS.map((m) => [m, EQUIPMENT_LABEL[m]])} />
      <SelectField label="Qué registras" value={tracking} onChange={(v) => setTracking(v as Tracking)} options={TRACKING_OPTIONS.map((m) => [m, TRACKING_LABEL[m]])} />
      {error && <p className="text-sm text-down">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn grad flex-1">
          {saving ? <LoaderCircle className="animate-spin" size={20} /> : "Crear"}
        </button>
      </div>
    </form>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-sub">
      {label}
      <span className="field">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none">
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
