"use client";

import { Flame, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { Sheet } from "@/components/sheet";
import { enqueue, flush } from "@/lib/live/outbox";
import { leaveTo } from "@/lib/nav-history";
import { estimateCalories, INTENSITY, pace, SPORTS, SPORT_BY_KEY, type SportKey } from "@/lib/sports";
import { formatNumber, parseDecimal } from "@/lib/units";

export type ActivityInput = {
  id: string;
  sport: SportKey;
  started_at: string;
  duration_minutes: number;
  distance_km: number | null;
  intensity: number | null;
  avg_heart_rate: number | null;
  details: Record<string, string | number>;
  notes: string | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Stepper({ value, onChange, step = 1, min = 0, max = 999, label, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; label: string; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-1" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="grid size-7 place-items-center rounded-lg bg-surface-2" aria-label={`Menos ${label}`}>
        <Minus size={14} />
      </button>
      <b className="num text-[15px]">
        {value}
        {suffix && <span className="ml-0.5 text-xs font-medium text-sub">{suffix}</span>}
      </b>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="grid size-7 place-items-center rounded-lg bg-surface-2" aria-label={`Más ${label}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}

const boxCls = "rounded-2xl border border-line bg-surface px-3 py-2.5";
const labelCls = "mb-1 block text-[10.5px] font-semibold text-sub";

export function SportForm({ initial, weightKg, hasWeight }: { initial: ActivityInput | null; weightKg: number; hasWeight: boolean }) {
  const router = useRouter();
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [sport, setSport] = useState<SportKey>(initial?.sport ?? "soccer");
  const [when, setWhen] = useState(() => toLocalInput(initial?.started_at ?? new Date().toISOString()));
  const [minutes, setMinutes] = useState(initial?.duration_minutes ?? 60);
  const [distance, setDistance] = useState(initial?.distance_km != null ? formatNumber(initial.distance_km, 2).replace(/\./g, "") : "");
  const [intensity, setIntensity] = useState(initial?.intensity ?? 3);
  const [hr, setHr] = useState(initial?.avg_heart_rate ? String(initial.avg_heart_rate) : "");
  const [details, setDetails] = useState<Record<string, string | number>>(initial?.details ?? {});
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const def = SPORT_BY_KEY[sport];
  const distanceKm = parseDecimal(distance);
  const kcal = useMemo(() => estimateCalories(def, minutes, weightKg, intensity, distanceKm), [def, minutes, weightKg, intensity, distanceKm]);
  const showPace = (sport === "running" || sport === "walking" || sport === "hiking") && pace(minutes, distanceKm);

  const pickSport = (key: SportKey) => {
    setSport(key);
    // Conserva solo los campos que aplican al nuevo deporte.
    const keys = new Set(SPORT_BY_KEY[key].fields.map((f) => f.key));
    setDetails((d) => Object.fromEntries(Object.entries(d).filter(([k]) => keys.has(k))));
  };

  const save = async () => {
    const started = new Date(when);
    if (Number.isNaN(started.getTime())) return setError("Revisa la fecha y la hora.");
    if (minutes < 1) return setError("La duración debe ser de al menos 1 minuto.");
    const heart = hr ? Number(hr) : null;
    if (heart != null && (heart < 30 || heart > 250)) return setError("El pulso promedio debe estar entre 30 y 250.");
    setSaving(true);
    setError(null);
    enqueue({
      kind: "upsert",
      table: "activities",
      row: {
        id,
        sport,
        started_at: started.toISOString(),
        duration_minutes: minutes,
        distance_km: def.distance ? distanceKm : null,
        intensity,
        calories: kcal,
        avg_heart_rate: heart,
        details,
        notes: notes.trim() || null,
      },
    });
    await flush();
    leaveTo(router, "/historial");
  };

  const remove = async () => {
    enqueue({ kind: "delete", table: "activities", key: id });
    await flush();
    leaveTo(router, "/historial");
  };

  return (
    <div className="flex flex-col gap-3.5 pb-24">
      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2.5">
        <BackButton fallback={initial ? "/historial" : "/entrenar"} icon="close" label="Cerrar" />
        <h1 className="text-center font-display text-[16px] font-semibold">{initial ? "Editar actividad" : "Registrar actividad"}</h1>
        {initial ? (
          <button onClick={() => setConfirmDelete(true)} className="icon-btn text-down" aria-label="Eliminar actividad">
            <Trash2 size={18} />
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Deporte">
        {SPORTS.map((s) => {
          const on = s.key === sport;
          return (
            <button
              key={s.key}
              role="radio"
              aria-checked={on}
              onClick={() => pickSport(s.key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 pt-2.5 pb-2 text-[10.5px] leading-tight font-semibold transition-colors ${
                on ? "grad-warm border-transparent text-white" : "border-line bg-surface text-sub"
              }`}
            >
              <s.Icon size={22} className={on ? "" : "text-fg"} />
              {s.label}
            </button>
          );
        })}
      </div>

      <label className={boxCls}>
        <span className={labelCls}>Fecha y hora</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="num w-full bg-transparent text-[15px] font-bold outline-none" />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className={boxCls}>
          <span className={labelCls}>Duración</span>
          <Stepper label="minutos" value={minutes} onChange={setMinutes} step={5} min={5} max={600} suffix="min" />
        </div>
        {def.distance ? (
          <label className={boxCls}>
            <span className={labelCls}>Distancia (opcional)</span>
            <span className="flex items-baseline gap-1">
              <input value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="0" aria-label="Distancia en kilómetros" className="num w-full min-w-0 bg-transparent text-[15px] font-bold outline-none" />
              <span className="text-xs text-sub">km</span>
            </span>
          </label>
        ) : (
          <label className={boxCls}>
            <span className={labelCls}>Pulso promedio (opcional)</span>
            <span className="flex items-baseline gap-1">
              <input value={hr} onChange={(e) => setHr(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="—" aria-label="Pulso promedio" className="num w-full min-w-0 bg-transparent text-[15px] font-bold outline-none" />
              <span className="text-xs text-sub">ppm</span>
            </span>
          </label>
        )}
      </div>

      {showPace && <p className="-mt-1.5 text-right text-xs text-sub">Ritmo: <b className="num text-fg">{showPace}</b></p>}

      <div className={boxCls}>
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-sub">Intensidad</span>
          <b className="text-xs text-warm">{INTENSITY[intensity - 1]}</b>
        </div>
        <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Intensidad">
          {INTENSITY.map((label, i) => (
            <button
              key={label}
              role="radio"
              aria-checked={intensity === i + 1}
              aria-label={label}
              onClick={() => setIntensity(i + 1)}
              className={`h-3 flex-1 rounded-full transition-colors ${i < intensity ? "bg-gradient-to-r from-warm to-[#ff3d6e]" : "bg-surface-2"}`}
            />
          ))}
        </div>
      </div>

      {def.fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {def.fields.map((f) =>
            f.kind === "int" ? (
              <div key={f.key} className={boxCls}>
                <span className={labelCls}>{f.label}</span>
                <Stepper label={f.label} value={Number(details[f.key] ?? 0)} max={f.max ?? 99} step={f.max && f.max > 99 ? 10 : 1} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} />
              </div>
            ) : (
              <label key={f.key} className={boxCls}>
                <span className={labelCls}>{f.label}</span>
                <select
                  value={String(details[f.key] ?? "")}
                  onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="w-full appearance-none bg-transparent text-[15px] font-bold outline-none"
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ),
          )}
        </div>
      )}

      {def.distance && (
        <label className={boxCls}>
          <span className={labelCls}>Pulso promedio (opcional)</span>
          <span className="flex items-baseline gap-1">
            <input value={hr} onChange={(e) => setHr(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="—" aria-label="Pulso promedio" className="num w-full min-w-0 bg-transparent text-[15px] font-bold outline-none" />
            <span className="text-xs text-sub">ppm</span>
          </span>
        </label>
      )}

      <label className="field h-auto items-start py-3">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="Notas (opcional): partido con los del trabajo, cancha sintética…" aria-label="Notas" className="resize-none" />
      </label>

      <p className="flex items-center gap-2 text-[12.5px] text-sub">
        <Flame size={18} className="flex-none text-warm" fill="currentColor" />
        <span>
          Unas <b className="num text-fg">{formatNumber(kcal, 0)} kcal</b> estimadas
          {hasWeight ? " según tu peso." : " con 70 kg. Registra tu peso en Cuerpo para afinar el cálculo."}
        </span>
      </p>

      {error && <p className="text-sm text-down">{error}</p>}

      <div className="fixed inset-x-4 z-40 mx-auto max-w-[430px]" style={{ bottom: "max(env(safe-area-inset-bottom), 14px)" }}>
        <button onClick={save} disabled={saving} className="btn grad-warm w-full shadow-[0_14px_30px_-12px_var(--warm)]">
          {saving ? <LoaderCircle className="animate-spin" size={20} /> : initial ? "Guardar cambios" : "Guardar actividad"}
        </button>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="¿Eliminar actividad?">
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-sm text-sub">Se borra de tu historial y de tu constancia.</p>
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
