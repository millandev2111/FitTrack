"use client";

import { ArrowDown, ArrowUp, Calculator, Check, Ellipsis, Link2, Link2Off, Lightbulb, NotebookPen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseMotion, ExerciseThumb } from "@/components/exercise-photo";
import { PlateCalculator } from "@/components/plate-calculator";
import { Sheet, SheetAction } from "@/components/sheet";
import { exercisePhoto } from "@/lib/exercise-photos";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/labels";
import type { LiveExercise, LiveSet, PrevSet } from "@/lib/live/workout";
import { compareSet, suggestNext } from "@/lib/progress";
import { relativeDay } from "@/lib/text";
import type { SetType, Unit } from "@/lib/types";
import { formatNumber, formatWeight, fromUnit, toUnit } from "@/lib/units";
import { NumberCell } from "./number-cell";

const TYPE_LABEL: Record<SetType, string> = { warmup: "Calentamiento", normal: "Normal", drop: "Drop set", failure: "Al fallo" };
const TYPE_SHORT: Record<SetType, string> = { warmup: "C", normal: "", drop: "D", failure: "F" };

export type CardActions = {
  updateSet: (setIdx: number, patch: Partial<LiveSet>) => void;
  toggleSet: (setIdx: number) => void;
  addSet: () => void;
  removeSet: (setIdx: number) => void;
  removeExercise: () => void;
  move: (dir: -1 | 1) => void;
  applyWeight: (weightKg: number) => void;
  setNotes: (notes: string | null) => void;
  linkNext: () => void;
  unlink: () => void;
};

export type SupersetInfo = { label: string; position: "first" | "middle" | "last" } | null;

const PLATE_EQUIPMENT = new Set(["barbell", "ez_bar", "smith_machine"]);

function prevLabel(p: PrevSet | undefined, tracking: string, unit: Unit) {
  if (!p) return "—";
  if (tracking === "time") return p.duration_seconds != null ? `${p.duration_seconds} s` : "—";
  if (tracking === "distance_time") return p.distance_m != null ? `${formatNumber(p.distance_m / 1000, 2)} km` : "—";
  const w = toUnit(p.weight_kg, unit);
  if (tracking === "bodyweight_reps" && !w) return `${p.reps ?? "—"} reps`;
  return `${w != null ? formatNumber(w, 2) : "—"} × ${p.reps ?? "—"}`;
}

function deltaBadge(s: LiveSet, p: PrevSet | undefined, unit: Unit) {
  if (!s.completed || !p || s.set_type === "warmup") return null;
  const trend = compareSet(s, p);
  if (!trend || trend === "same") return trend === "same" ? { text: "=", tone: "same" as const } : null;
  const dw = (toUnit(s.weight_kg, unit) ?? 0) - (toUnit(p.weight_kg, unit) ?? 0);
  if (Math.abs(dw) > 0.01) return { text: `${dw > 0 ? "+" : "−"}${formatNumber(Math.abs(dw), 2)}`, tone: trend };
  const dr = (s.reps ?? 0) - (p.reps ?? 0);
  return { text: `${dr > 0 ? "+" : "−"}${Math.abs(dr)} rep`, tone: trend };
}

export function ExerciseCard({
  item,
  index,
  total,
  unit,
  actions,
  superset,
  canLinkNext,
}: {
  item: LiveExercise;
  index: number;
  total: number;
  unit: Unit;
  actions: CardActions;
  superset: SupersetInfo;
  canLinkNext: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [plates, setPlates] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.notes ?? "");
  const [setMenuIdx, setSetMenuIdx] = useState<number | null>(null);
  const { exercise, previous } = item;
  const tracking = exercise.tracking;
  const isWeight = tracking === "weight_reps" || tracking === "bodyweight_reps";

  const suggestion = useMemo(() => {
    if (!isWeight || !previous) return null;
    const work = previous.filter((p) => p.set_type !== "warmup");
    return suggestNext({ previous: work, repMin: item.rep_min, repMax: item.rep_max, equipment: exercise.equipment, unit });
  }, [isWeight, previous, item.rep_min, item.rep_max, exercise.equipment, unit]);

  const alreadyApplied =
    suggestion?.kind === "increase" &&
    item.sets.filter((s) => s.set_type !== "warmup").every((s) => Math.abs((s.weight_kg ?? 0) - suggestion.weightKg) < 0.01);

  const doneCount = item.sets.filter((s) => s.completed).length;
  const range = item.rep_min && item.rep_max ? `${item.target_sets} × ${item.rep_min}–${item.rep_max}` : null;

  const columns = isWeight ? "grid-cols-[28px_1fr_64px_52px_34px]" : tracking === "time" ? "grid-cols-[28px_1fr_76px_34px]" : "grid-cols-[28px_1fr_60px_56px_34px]";

  return (
    <section
      className={`card relative p-3.5 ${superset ? "border-a1/40" : ""} ${superset && superset.position !== "last" ? "mb-[-6px] rounded-b-[14px]" : ""} ${superset && superset.position !== "first" ? "rounded-t-[14px]" : ""}`}
      aria-label={exercise.name}
    >
      {superset && (
        <span className="absolute top-0 left-4 -translate-y-1/2 rounded-full bg-a1 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
          {superset.label}
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {exercisePhoto(exercise.slug) && (
            <button onClick={() => setPhoto(true)} aria-label={`Ver cómo se hace ${exercise.name}`} className="flex-none active:scale-95">
              <ExerciseThumb slug={exercise.slug} size={42} />
            </button>
          )}
          <Link href={`/ejercicios/${exercise.id}`} className="min-w-0">
            <h2 className="line-clamp-2 font-display text-[17px] leading-tight font-semibold">{exercise.name}</h2>
            <p className="text-[11.5px] text-sub">
              {EQUIPMENT_LABEL[exercise.equipment]} · {MUSCLE_LABEL[exercise.primary_muscle]}
              {range ? ` · ${range}` : ""}
            </p>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          {PLATE_EQUIPMENT.has(exercise.equipment) && (
            <button className="icon-btn size-8.5 rounded-[11px]" onClick={() => setPlates(true)} aria-label="Calculadora de discos">
              <Calculator size={17} />
            </button>
          )}
          <span className="chip chip-accent num">
            {doneCount}/{item.sets.length}
          </span>
          <button className="icon-btn size-8.5 rounded-[11px]" onClick={() => setMenu(true)} aria-label={`Opciones de ${exercise.name}`}>
            <Ellipsis size={18} />
          </button>
        </div>
      </div>

      {item.notes && (
        <button onClick={() => setNoteOpen(true)} className="mt-2.5 flex w-full items-start gap-2 rounded-[13px] bg-surface-2 px-2.5 py-2 text-left text-[12px] leading-snug text-sub">
          <NotebookPen size={15} className="mt-px flex-none" />
          <span className="italic">{item.notes}</span>
        </button>
      )}

      {suggestion && !alreadyApplied && doneCount === 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-[13px] bg-a1/12 px-2.5 py-2 text-[12px] leading-snug">
          <Lightbulb size={16} className="mt-px flex-none text-a1" />
          <span className="flex-1">
            {suggestion.text}
            {suggestion.kind === "increase" && <b className="text-a1"> {formatWeight(suggestion.weightKg, unit)}</b>}
            {item.previous_at && <span className="text-sub"> · última vez {relativeDay(item.previous_at)}</span>}
          </span>
          {suggestion.kind === "increase" && (
            <button onClick={() => actions.applyWeight(suggestion.weightKg)} className="flex-none rounded-lg bg-a1 px-2 py-1 text-[11px] font-bold text-white">
              Aplicar
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        <div className={`grid ${columns} items-center gap-1.5 text-center text-[10px] font-bold tracking-wide text-sub uppercase`}>
          <span>Serie</span>
          <span>Anterior</span>
          {isWeight && <span>{tracking === "bodyweight_reps" ? `+${unit}` : unit}</span>}
          {isWeight && <span>Reps</span>}
          {tracking === "time" && <span>Seg</span>}
          {tracking === "distance_time" && <span>Km</span>}
          {tracking === "distance_time" && <span>Min</span>}
          <span />
        </div>

        {item.sets.map((s, i) => {
          const p = previous?.[i];
          const badge = deltaBadge(s, p, unit);
          const cellBg = s.completed ? "bg-up/13" : "bg-surface-2 focus-within:bg-field focus-within:ring-[1.5px] focus-within:ring-a1";
          let setNumber = 0;
          for (let k = 0; k <= i; k++) if (item.sets[k].set_type !== "warmup") setNumber++;
          const setName = s.set_type === "warmup" ? `calentamiento ${i + 1}` : `serie ${setNumber}`;
          return (
            <div key={s.id} className={`grid ${columns} items-center gap-1.5 text-center text-[12.5px]`}>
              <button
                onClick={() => setSetMenuIdx(i)}
                className={`h-[34px] rounded-[10px] font-display text-[12.5px] font-bold ${s.set_type === "warmup" ? "text-same" : s.set_type === "normal" ? "text-sub" : "text-warm"}`}
                aria-label={`${setName}: ${TYPE_LABEL[s.set_type]}. Cambiar tipo o eliminar`}
              >
                {TYPE_SHORT[s.set_type] || setNumber}
              </button>
              <span className="truncate text-[11.5px] text-sub tabular-nums">{prevLabel(p, tracking, unit)}</span>

              {isWeight && (
                <span className={`relative rounded-[11px] ${cellBg}`}>
                  <NumberCell
                    label={`Peso ${setName}`}
                    value={toUnit(s.weight_kg, unit)}
                    placeholder={tracking === "bodyweight_reps" ? "0" : toUnit(p?.weight_kg, unit)?.toString().replace(".", ",") ?? "0"}
                    onChange={(v) => actions.updateSet(i, { weight_kg: fromUnit(v, unit) })}
                  />
                  {badge && (
                    <em
                      className={`pointer-events-none absolute -top-1.5 -right-1.5 rounded-md px-1 py-px text-[8.5px] font-extrabold not-italic ${
                        badge.tone === "up" ? "bg-up text-[#062a1d]" : badge.tone === "down" ? "bg-down text-white" : "bg-same text-[#2a1a00]"
                      }`}
                    >
                      {badge.text}
                    </em>
                  )}
                </span>
              )}
              {isWeight && (
                <span className={`rounded-[11px] ${cellBg}`}>
                  <NumberCell label={`Repeticiones ${setName}`} integer value={s.reps} placeholder={p?.reps?.toString() ?? "0"} onChange={(v) => actions.updateSet(i, { reps: v })} />
                </span>
              )}
              {tracking === "time" && (
                <span className={`rounded-[11px] ${cellBg}`}>
                  <NumberCell label={`Segundos ${setName}`} integer value={s.duration_seconds} placeholder={p?.duration_seconds?.toString() ?? "0"} onChange={(v) => actions.updateSet(i, { duration_seconds: v })} />
                </span>
              )}
              {tracking === "distance_time" && (
                <>
                  <span className={`rounded-[11px] ${cellBg}`}>
                    <NumberCell label={`Kilómetros ${setName}`} value={s.distance_m != null ? s.distance_m / 1000 : null} placeholder="0" onChange={(v) => actions.updateSet(i, { distance_m: v != null ? Math.round(v * 1000) : null })} />
                  </span>
                  <span className={`rounded-[11px] ${cellBg}`}>
                    <NumberCell label={`Minutos ${setName}`} value={s.duration_seconds != null ? s.duration_seconds / 60 : null} decimals={1} placeholder="0" onChange={(v) => actions.updateSet(i, { duration_seconds: v != null ? Math.round(v * 60) : null })} />
                  </span>
                </>
              )}

              <button
                onClick={() => actions.toggleSet(i)}
                aria-pressed={s.completed}
                aria-label={s.completed ? `Desmarcar ${setName}` : `Completar ${setName}`}
                className={`grid size-[34px] place-items-center rounded-[11px] transition-all active:scale-90 ${s.completed ? "bg-up text-[#062a1d]" : "bg-surface-2 text-sub"}`}
              >
                <Check size={19} strokeWidth={s.completed ? 3 : 2.2} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={actions.addSet} className="mt-2.5 flex h-9 w-full items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-line text-xs font-semibold text-sub">
        <Plus size={16} /> Añadir serie
      </button>

      <Sheet open={photo} onClose={() => setPhoto(false)} title={exercise.name}>
        <div className="pb-3">
          <ExerciseMotion slug={exercise.slug} name={exercise.name} />
        </div>
      </Sheet>

      <PlateCalculator
        open={plates}
        onClose={() => setPlates(false)}
        unit={unit}
        equipment={exercise.equipment}
        weightKg={(item.sets.find((s) => !s.completed && s.set_type !== "warmup") ?? item.sets[item.sets.length - 1])?.weight_kg ?? null}
      />

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Nota del ejercicio">
        <div className="flex flex-col gap-2.5 pb-2">
          <label className="field h-auto items-start py-3">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Agarre cerrado, molestia en el hombro, asiento en 4…"
              aria-label="Nota del ejercicio"
              className="resize-none"
            />
          </label>
          <button
            onClick={() => {
              actions.setNotes(noteDraft.trim() || null);
              setNoteOpen(false);
            }}
            className="btn grad w-full"
          >
            Guardar nota
          </button>
        </div>
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={exercise.name}>
        <div className="flex flex-col pb-2">
          <SheetAction
            icon={<NotebookPen size={20} />}
            onClick={() => {
              setNoteDraft(item.notes ?? "");
              setMenu(false);
              setNoteOpen(true);
            }}
          >
            {item.notes ? "Editar nota" : "Añadir nota"}
          </SheetAction>
          {canLinkNext && (
            <SheetAction icon={<Link2 size={20} />} onClick={() => (actions.linkNext(), setMenu(false))}>
              Hacer superserie con el siguiente
            </SheetAction>
          )}
          {superset && (
            <SheetAction icon={<Link2Off size={20} />} onClick={() => (actions.unlink(), setMenu(false))}>
              Sacar de la superserie
            </SheetAction>
          )}
          {index > 0 && (
            <SheetAction icon={<ArrowUp size={20} />} onClick={() => (actions.move(-1), setMenu(false))}>
              Mover arriba
            </SheetAction>
          )}
          {index < total - 1 && (
            <SheetAction icon={<ArrowDown size={20} />} onClick={() => (actions.move(1), setMenu(false))}>
              Mover abajo
            </SheetAction>
          )}
          <SheetAction tone="danger" icon={<Trash2 size={20} />} onClick={() => (actions.removeExercise(), setMenu(false))}>
            Quitar ejercicio de la sesión
          </SheetAction>
        </div>
      </Sheet>

      <Sheet open={setMenuIdx != null} onClose={() => setSetMenuIdx(null)} title={setMenuIdx != null ? `Serie ${setMenuIdx + 1}` : undefined}>
        <div className="flex flex-col pb-2">
          {(Object.keys(TYPE_LABEL) as SetType[]).map((t) => (
            <SheetAction
              key={t}
              icon={<span className="grid size-6 place-items-center rounded-lg bg-surface-2 text-xs font-bold">{TYPE_SHORT[t] || "#"}</span>}
              onClick={() => {
                if (setMenuIdx != null) actions.updateSet(setMenuIdx, { set_type: t });
                setSetMenuIdx(null);
              }}
            >
              {TYPE_LABEL[t]}
              {setMenuIdx != null && item.sets[setMenuIdx]?.set_type === t && <Check size={18} className="ml-auto text-a1" />}
            </SheetAction>
          ))}
          <SheetAction
            tone="danger"
            icon={<Trash2 size={20} />}
            onClick={() => {
              if (setMenuIdx != null) actions.removeSet(setMenuIdx);
              setSetMenuIdx(null);
            }}
          >
            Eliminar serie
          </SheetAction>
        </div>
      </Sheet>
    </section>
  );
}
