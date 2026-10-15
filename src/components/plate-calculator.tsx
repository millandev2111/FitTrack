"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { BARS, PLATES, PLATE_STYLE, platesPerSide } from "@/lib/plates";
import type { Equipment, Unit } from "@/lib/types";
import { formatNumber, parseDecimal, toUnit } from "@/lib/units";
import { Sheet } from "./sheet";

function defaultBar(equipment: Equipment | undefined, unit: Unit) {
  if (equipment === "ez_bar") return unit === "kg" ? 10 : 25;
  if (equipment === "machine" || equipment === "smith_machine" || equipment === "cable") return 0;
  return unit === "kg" ? 20 : 45;
}

export function PlateCalculator({
  open,
  onClose,
  unit,
  weightKg,
  equipment,
}: {
  open: boolean;
  onClose: () => void;
  unit: Unit;
  weightKg: number | null;
  equipment?: Equipment;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de discos">
      {open && <Calculator unit={unit} initial={toUnit(weightKg, unit) ?? (unit === "kg" ? 60 : 135)} bar={defaultBar(equipment, unit)} />}
    </Sheet>
  );
}

function Calculator({ unit, initial, bar: initialBar }: { unit: Unit; initial: number; bar: number }) {
  const [text, setText] = useState(formatNumber(initial, 2).replace(/\./g, ""));
  const [bar, setBar] = useState(initialBar);
  const total = parseDecimal(text) ?? 0;
  const step = unit === "kg" ? 2.5 : 5;
  const { plates, remainder } = platesPerSide(total, bar, PLATES[unit]);
  const built = total - remainder;

  const grouped = plates.reduce<{ p: number; n: number }[]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && last.p === p) last.n++;
    else acc.push({ p, n: 1 });
    return acc;
  }, []);

  const bump = (d: number) => setText(formatNumber(Math.max(0, total + d), 2).replace(/\./g, ""));

  return (
    <div className="flex flex-col gap-4 pb-3">
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => bump(-step)} className="grid size-11 place-items-center rounded-2xl bg-surface-2" aria-label={`Restar ${formatNumber(step, 2)} ${unit}`}>
          <Minus size={20} />
        </button>
        <label className="flex items-baseline gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            aria-label={`Peso total en ${unit}`}
            className="num w-32 bg-transparent text-center text-[40px] font-bold tracking-tight outline-none"
          />
          <span className="text-lg font-semibold text-sub">{unit}</span>
        </label>
        <button onClick={() => bump(step)} className="grid size-11 place-items-center rounded-2xl bg-surface-2" aria-label={`Sumar ${formatNumber(step, 2)} ${unit}`}>
          <Plus size={20} />
        </button>
      </div>

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
        {BARS[unit].map((b) => (
          <button
            key={b.value}
            onClick={() => setBar(b.value)}
            className={`h-8 flex-none rounded-full px-3 text-[12px] font-semibold ${bar === b.value ? "grad" : "bg-surface text-sub"}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Un lado de la barra, del centro hacia afuera */}
      <div className="card flex h-36 items-center overflow-hidden px-4 py-3.5" aria-hidden>
        <div className="h-3 w-10 flex-none rounded-l bg-sub/50" />
        <div className="h-7 w-2.5 flex-none rounded-sm bg-sub/70" />
        <div className="relative flex h-full flex-1 items-center">
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-r bg-sub/40" />
          <div className="relative flex h-full items-center gap-[3px] pl-1">
            {plates.map((p, i) => {
              const st = PLATE_STYLE[`${unit}-${p}`];
              return (
                <span
                  key={i}
                  className="pop-in grid w-[22px] place-items-center rounded-[5px] text-[9px] font-extrabold [writing-mode:vertical-rl]"
                  style={{ height: `${st.h}%`, background: st.bg, color: st.fg, animationDelay: `${i * 40}ms`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.22), 0 0 0 1px rgba(0,0,0,.12)" }}
                >
                  {formatNumber(p, 2)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <b className="text-[14px]">Por cada lado</b>
          <span className="text-xs text-sub">
            {bar > 0 ? `barra de ${formatNumber(bar, 2)} ${unit}` : "sin barra"}
          </span>
        </div>
        {grouped.length === 0 ? (
          <p className="text-sm text-sub">{total <= bar ? "Solo la barra." : "Escribe el peso total."}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {grouped.map(({ p, n }) => {
              const st = PLATE_STYLE[`${unit}-${p}`];
              return (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[13px] font-semibold shadow-(--shadow)">
                  <i className="size-3 rounded-full" style={{ background: st.bg, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
                  {n} × {formatNumber(p, 2)} {unit}
                </span>
              );
            })}
          </div>
        )}
        {remainder > 0.001 && (
          <p className="rounded-2xl bg-same/14 px-3 py-2 text-[12.5px] text-same">
            No se puede armar exacto con discos estándar. Lo más cercano: {formatNumber(built, 2)} {unit}.
          </p>
        )}
      </div>
    </div>
  );
}
