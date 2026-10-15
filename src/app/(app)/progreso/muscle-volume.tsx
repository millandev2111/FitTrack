"use client";

import { useState } from "react";

export type MuscleRow = { key: string; label: string; thisWeek: number; lastWeek: number };

const MAX = 24;
const ZONE = { min: 10, max: 20 };

export function MuscleVolume({ rows }: { rows: MuscleRow[] }) {
  const [week, setWeek] = useState<"thisWeek" | "lastWeek">("thisWeek");

  return (
    <section className="card p-4" aria-label="Series por músculo">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-semibold">Series por músculo</h2>
        <span className="text-[11px] text-sub">
          meta {ZONE.min}–{ZONE.max} por semana
        </span>
      </div>
      <div className="mt-2.5">
        <div className="seg">
          <button aria-pressed={week === "thisWeek"} onClick={() => setWeek("thisWeek")}>
            Esta semana
          </button>
          <button aria-pressed={week === "lastWeek"} onClick={() => setWeek("lastWeek")}>
            Semana pasada
          </button>
        </div>
      </div>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {rows.map((r) => {
          const v = r[week];
          const low = v < ZONE.min;
          return (
            <li key={r.key} className="grid grid-cols-[64px_1fr_28px] items-center gap-2 text-[12px]">
              <span className="font-semibold">{r.label}</span>
              <span className="relative h-2.5 rounded-full bg-surface-2">
                <i
                  className="absolute -top-[3px] -bottom-[3px] rounded-[4px] border border-dashed border-sub/50"
                  style={{ left: `${(ZONE.min / MAX) * 100}%`, width: `${((ZONE.max - ZONE.min) / MAX) * 100}%` }}
                  aria-hidden
                />
                <i
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${low ? "bg-same" : "bg-gradient-to-r from-a1 to-a2"}`}
                  style={{ width: `${Math.min(100, (v / MAX) * 100)}%` }}
                  aria-hidden
                />
              </span>
              <b className="num text-right text-[12.5px]">{v}</b>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-snug text-sub">
        Cuenta las series de trabajo del músculo principal de cada ejercicio. En amarillo, los que están por debajo de la meta.
      </p>
    </section>
  );
}
