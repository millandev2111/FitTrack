"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useId, useState } from "react";
import { formatShortDate } from "@/lib/text";
import type { Unit } from "@/lib/types";
import { formatNumber, toUnit } from "@/lib/units";

export type ChartPoint = { at: string; e1rm: number | null; top: number | null; volume: number };
type Metric = "e1rm" | "top" | "volume";

const METRICS: { id: Metric; label: string }[] = [
  { id: "e1rm", label: "1RM estimado" },
  { id: "top", label: "Peso máx." },
  { id: "volume", label: "Volumen" },
];

function niceTicks(min: number, max: number, count = 3) {
  const span = max - min || Math.max(1, max * 0.1);
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function ProgressChart({ points, unit, tz }: { points: ChartPoint[]; unit: Unit; tz: string }) {
  const [metric, setMetric] = useState<Metric>(points.some((p) => p.e1rm != null) ? "e1rm" : "volume");
  const gid = useId().replace(/:/g, "");
  const data = points
    .map((p) => ({ at: p.at, v: metric === "volume" ? toUnit(p.volume, unit) : toUnit(metric === "e1rm" ? p.e1rm : p.top, unit) }))
    .filter((p): p is { at: string; v: number } => p.v != null && p.v > 0);

  const W = 300;
  const H = 150;
  const padL = 30;
  const padR = 12;
  const top = 24;
  const bottom = 128;

  const last = data[data.length - 1];
  const first = data[0];
  const change = first && last && first.v > 0 ? ((last.v - first.v) / first.v) * 100 : 0;
  const ticks = data.length ? niceTicks(Math.min(...data.map((d) => d.v)), Math.max(...data.map((d) => d.v))) : [];
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;
  const x = (i: number) => (data.length === 1 ? (padL + W - padR) / 2 : padL + (i * (W - padR - padL)) / (data.length - 1));
  const y = (v: number) => bottom - ((v - yMin) / (yMax - yMin || 1)) * (bottom - top);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(" ");
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)},${bottom} L${x(0).toFixed(1)},${bottom} Z` : "";
  const fmt = (v: number) => (metric === "volume" ? formatNumber(v, 0) : formatNumber(v, 1));
  const bubbleX = last ? Math.min(Math.max(x(data.length - 1), padL + 30), W - 32) : 0;

  return (
    <section className="card p-3.5 pb-2">
      <div className="seg" role="group" aria-label="Métrica">
        {METRICS.map((m) => (
          <button key={m.id} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-sub">Completa una sesión con este ejercicio para ver tu evolución.</p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="num text-[32px] leading-none font-bold tracking-tight">
              {fmt(last.v)}
              <small className="ml-1 text-sm font-medium text-sub">{unit}</small>
            </div>
            {data.length > 1 && Math.abs(change) >= 0.1 && (
              <span className={`chip ${change > 0 ? "chip-up" : "chip-down"}`}>
                {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {change > 0 ? "+" : ""}
                {formatNumber(change, 1)} % desde {formatShortDate(first.at, tz)}
              </span>
            )}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-auto w-full" role="img" aria-label={`Evolución: de ${fmt(first.v)} a ${fmt(last.v)} ${unit}`}>
            <defs>
              <linearGradient id={`a${gid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--a1)" stopOpacity=".35" />
                <stop offset="1" stopColor="var(--a1)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`l${gid}`} x1="0" x2="1">
                <stop offset="0" stopColor="var(--a2)" />
                <stop offset="1" stopColor="var(--a1)" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                <text x={0} y={y(t) + 3} fill="var(--sub)" fontSize="9" fontWeight="600">
                  {formatNumber(t, metric === "volume" ? 0 : 1)}
                </text>
              </g>
            ))}
            <path d={area} fill={`url(#a${gid})`} />
            <path d={line} fill="none" stroke={`url(#l${gid})`} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {data.length <= 30 &&
              data.slice(0, -1).map((d, i) => <circle key={d.at} cx={x(i)} cy={y(d.v)} r="3" fill="var(--surface)" stroke="var(--a1)" strokeWidth="2" />)}
            <circle cx={x(data.length - 1)} cy={y(last.v)} r="9" fill="var(--a1)" opacity=".2" />
            <circle cx={x(data.length - 1)} cy={y(last.v)} r="5" fill="var(--a1)" stroke="var(--surface)" strokeWidth="2" />
            <rect x={bubbleX - 28} y={2} width={56} height={18} rx={7} fill="var(--fg)" />
            <text x={bubbleX} y={14.5} textAnchor="middle" fill="var(--bg)" fontSize="10" fontWeight="700">
              {fmt(last.v)} {unit}
            </text>
            <text x={x(0)} y={H - 4} textAnchor={data.length === 1 ? "middle" : "start"} fill="var(--sub)" fontSize="9" fontWeight="600">
              {formatShortDate(first.at, tz)}
            </text>
            {data.length > 1 && (
              <text x={x(data.length - 1)} y={H - 4} textAnchor="end" fill="var(--sub)" fontSize="9" fontWeight="600">
                {formatShortDate(last.at, tz)}
              </text>
            )}
          </svg>
        </>
      )}
    </section>
  );
}
