import { ArrowDown, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";
import { LineChart } from "@/components/line-chart";
import { MEASURES, type MetricRow } from "@/lib/body";
import { localDate } from "@/lib/progress";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { formatDay, formatShortDate } from "@/lib/text";
import type { Unit } from "@/lib/types";
import { formatNumber, toUnit } from "@/lib/units";
import { BodyTabs } from "./body-tabs";
import { MetricsButton } from "./metrics-form";

export const metadata: Metadata = { title: "Cuerpo" };

function Delta({ value, unit, invert = false }: { value: number | null; unit: string; invert?: boolean }) {
  if (value == null || Math.abs(value) < 0.05) return <span className="text-[11px] text-sub">sin cambio</span>;
  // Para el peso no hay "bueno" o "malo": se muestra neutro. En cintura bajar es lo esperado.
  const good = invert ? value < 0 : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold ${good == null ? "text-sub" : good ? "text-up" : "text-same"}`}>
      {value > 0 ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
      {formatNumber(Math.abs(value), 1)} {unit}
    </span>
  );
}

export default async function BodyPage() {
  const { supabase } = await requireUser();
  const [{ data: profile }, { data }] = await Promise.all([
    getProfile().then((data) => ({ data })),
    supabase.from("body_metrics").select("*").order("measured_on", { ascending: true }).limit(400),
  ]);
  const unit = (profile?.unit_system ?? "kg") as Unit;
  const tz = profile?.timezone ?? "America/Bogota";
  const today = localDate(new Date(), tz);
  const rows = ((data ?? []) as MetricRow[]).map((r) => ({ ...r }));

  const weights = rows.filter((r) => r.weight_kg != null).map((r) => ({ at: `${r.measured_on}T12:00:00Z`, v: toUnit(Number(r.weight_kg), unit)! }));
  const lastW = weights[weights.length - 1];
  const monthAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  const refW = [...weights].reverse().find((w) => w.at.slice(0, 10) <= monthAgo) ?? weights[0];
  const latestWith = (key: keyof MetricRow) => [...rows].reverse().find((r) => r[key] != null);
  const firstWith = (key: keyof MetricRow) => rows.find((r) => r[key] != null);
  const fat = latestWith("body_fat_pct");

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <BackButton fallback="/progreso" />
        <h1 className="font-display text-[26px] font-bold tracking-tight">Cuerpo</h1>
      </div>
      <BodyTabs />

      <section className="card p-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <small className="text-xs font-semibold text-sub">Peso corporal</small>
            <div className="num text-[32px] leading-none font-bold tracking-tight">
              {lastW ? formatNumber(lastW.v, 1) : "–"}
              <small className="ml-1 text-sm font-medium text-sub">{unit}</small>
            </div>
          </div>
          <div className="text-right">
            {lastW && refW && lastW !== refW && (
              <>
                <Delta value={lastW.v - refW.v} unit={unit} />
                <small className="block text-[10.5px] text-sub">desde {formatShortDate(refW.at, "UTC")}</small>
              </>
            )}
            {fat && <small className="mt-1 block text-[11px] text-sub">Grasa: <b className="text-fg">{formatNumber(Number(fat.body_fat_pct), 1)} %</b></small>}
          </div>
        </div>
        <div className="mt-3">
          {weights.length > 0 ? (
            <LineChart points={weights.slice(-60)} unit={unit} label="Peso corporal" formatX={(iso) => formatShortDate(iso, "UTC")} color="var(--a2)" />
          ) : (
            <p className="py-6 text-center text-sm text-sub">Registra tu peso para ver cómo cambia con el tiempo.</p>
          )}
        </div>
      </section>

      <MetricsButton rows={rows} today={today} />

      <section className="card px-4 py-1" aria-label="Medidas">
        {MEASURES.map((m) => {
          const last = latestWith(m.key);
          const first = firstWith(m.key);
          const v = last ? Number(last[m.key]) : null;
          const delta = last && first && last !== first ? v! - Number(first[m.key]) : null;
          return (
            <div key={m.key} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
              <span>
                <b className="block text-[14px]">{m.label}</b>
                {first && last && first !== last && <small className="text-[11px] text-sub">desde {formatShortDate(`${first.measured_on}T12:00:00Z`, "UTC")}</small>}
              </span>
              <span className="text-right">
                <b className="num block text-[16px]">{v != null ? `${formatNumber(v, 1)} cm` : "–"}</b>
                {delta != null && <Delta value={delta} unit="cm" invert={m.key === "waist_cm"} />}
              </span>
            </div>
          );
        })}
      </section>

      {rows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[15px] font-semibold">Registros</h2>
          <ul className="card flex flex-col px-4 py-1">
            {[...rows].reverse().slice(0, 12).map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-0">
                <span className="capitalize">{formatDay(`${r.measured_on}T12:00:00Z`, "UTC")}</span>
                <span className="num font-semibold">
                  {r.weight_kg != null ? `${formatNumber(toUnit(Number(r.weight_kg), unit), 1)} ${unit}` : "—"}
                  {r.waist_cm != null && <span className="ml-2 text-sub">cintura {formatNumber(Number(r.waist_cm), 1)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
