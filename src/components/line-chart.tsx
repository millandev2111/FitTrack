import { formatNumber } from "@/lib/units";

function niceTicks(min: number, max: number, count = 3) {
  const span = max - min || Math.max(1, Math.abs(max) * 0.05);
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks.length > 1 ? ticks : [lo, lo + step];
}

/** Gráfica de línea simple con área, cuadrícula y el último punto resaltado. */
export function LineChart({
  points,
  unit,
  label,
  formatX,
  color = "var(--a1)",
}: {
  points: { at: string; v: number }[];
  unit: string;
  label: string;
  formatX: (iso: string) => string;
  color?: string;
}) {
  if (points.length === 0) return null;
  const W = 300;
  const H = 140;
  const padL = 30;
  const padR = 10;
  const top = 22;
  const bottom = 116;
  const ticks = niceTicks(Math.min(...points.map((p) => p.v)), Math.max(...points.map((p) => p.v)));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const t0 = Date.parse(points[0].at);
  const t1 = Date.parse(points[points.length - 1].at);
  const x = (iso: string) => (t1 === t0 ? (padL + W - padR) / 2 : padL + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - padR - padL));
  const y = (v: number) => bottom - ((v - yMin) / (yMax - yMin || 1)) * (bottom - top);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const id = label.replace(/\W/g, "");
  const bx = Math.min(Math.max(x(last.at), padL + 30), W - 30);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${label}: de ${formatNumber(points[0].v, 1)} a ${formatNumber(last.v, 1)} ${unit}`}>
      <defs>
        <linearGradient id={`lc-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={0} y={y(t) + 3} fill="var(--sub)" fontSize="9" fontWeight="600">
            {formatNumber(t, 1)}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={`${line} L${x(last.at)},${bottom} L${x(points[0].at)},${bottom} Z`} fill={`url(#lc-${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.at)} cy={y(last.v)} r="8" fill={color} opacity=".2" />
      <circle cx={x(last.at)} cy={y(last.v)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
      <rect x={bx - 28} y={1} width={56} height={17} rx={6} fill="var(--fg)" />
      <text x={bx} y={12.8} textAnchor="middle" fill="var(--bg)" fontSize="9.5" fontWeight="700">
        {formatNumber(last.v, 1)} {unit}
      </text>
      <text x={padL} y={H - 4} fill="var(--sub)" fontSize="9" fontWeight="600">
        {formatX(points[0].at)}
      </text>
      {points.length > 1 && (
        <text x={W - padR} y={H - 4} textAnchor="end" fill="var(--sub)" fontSize="9" fontWeight="600">
          {formatX(last.at)}
        </text>
      )}
    </svg>
  );
}
