"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { MEASURES, type MetricRow } from "@/lib/body";
import { formatNumber, fromUnit, parseDecimal, toUnit } from "@/lib/units";

const show = (v: number | null | undefined, d = 1) => (v == null ? "" : formatNumber(v, d).replace(/\./g, ""));

export function MetricsButton({ rows, today }: { rows: MetricRow[]; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn grad w-full">
        <Plus size={18} /> Registrar peso o medidas
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Registrar medidas" tall>
        {open && <MetricsForm rows={rows} today={today} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}

function MetricsForm({ rows, today, onDone }: { rows: MetricRow[]; today: string; onDone: () => void }) {
  const router = useRouter();
  const profile = useProfile();
  const unit = profile.unit_system;
  const [date, setDate] = useState(today);
  const existing = rows.find((r) => r.measured_on === date);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(existing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function initialValues(r: MetricRow | undefined) {
    const v: Record<string, string> = { weight: show(toUnit(r?.weight_kg ?? null, unit)), fat: show(r?.body_fat_pct) };
    MEASURES.forEach((m) => (v[m.key] = show(r?.[m.key] as number | null)));
    return v;
  }

  const changeDate = (d: string) => {
    setDate(d);
    setValues(initialValues(rows.find((r) => r.measured_on === d)));
  };

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v.replace(/[^\d.,]/g, "") }));

  const save = async () => {
    const row: Record<string, unknown> = {
      user_id: profile.id,
      measured_on: date,
      weight_kg: fromUnit(parseDecimal(values.weight ?? ""), unit),
      body_fat_pct: parseDecimal(values.fat ?? ""),
    };
    MEASURES.forEach((m) => (row[m.key] = parseDecimal(values[m.key] ?? "")));
    if (Object.entries(row).every(([k, v]) => k === "user_id" || k === "measured_on" || v == null)) {
      setError("Escribe al menos un dato.");
      return;
    }
    const w = row.weight_kg as number | null;
    if (w != null && (w < 20 || w > 400)) return setError("Revisa el peso: debe estar entre 20 y 400 kg.");
    const fat = row.body_fat_pct as number | null;
    if (fat != null && (fat < 2 || fat > 70)) return setError("El % de grasa debe estar entre 2 y 70.");
    setSaving(true);
    setError(null);
    const { error: e } = await createClient().from("body_metrics").upsert(row, { onConflict: "user_id,measured_on" });
    setSaving(false);
    if (e) return setError("No se pudo guardar. Revisa tu conexión.");
    onDone();
    router.refresh();
  };

  const remove = async () => {
    if (!existing) return;
    setSaving(true);
    const { error: e } = await createClient().from("body_metrics").delete().eq("id", existing.id);
    setSaving(false);
    if (e) return setError("No se pudo eliminar. Revisa tu conexión.");
    onDone();
    router.refresh();
  };

  const input = (k: string, label: string, suffix: string) => (
    <label key={k} className="rounded-2xl border border-line bg-surface px-3 py-2">
      <span className="block text-[10.5px] font-semibold text-sub">{label}</span>
      <span className="flex items-baseline gap-1">
        <input value={values[k] ?? ""} onChange={(e) => set(k, e.target.value)} inputMode="decimal" placeholder="—" aria-label={`${label} en ${suffix}`} className="num w-full min-w-0 bg-transparent text-[16px] font-bold outline-none" />
        <span className="text-xs text-sub">{suffix}</span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-col gap-3 pb-2">
      <label className="rounded-2xl border border-line bg-surface px-3 py-2">
        <span className="block text-[10.5px] font-semibold text-sub">Fecha</span>
        <input type="date" value={date} max={today} onChange={(e) => changeDate(e.target.value)} className="num w-full bg-transparent text-[15px] font-bold outline-none" />
      </label>
      {existing && <p className="-mt-1 text-xs text-sub">Ya tienes datos de este día: los cambios los reemplazan.</p>}
      <div className="grid grid-cols-2 gap-2">
        {input("weight", "Peso", unit)}
        {input("fat", "Grasa corporal", "%")}
      </div>
      <p className="mt-1 text-xs font-semibold text-sub">Medidas (opcional)</p>
      <div className="grid grid-cols-2 gap-2">{MEASURES.map((m) => input(m.key, m.label, "cm"))}</div>
      <p className="text-[11.5px] leading-snug text-sub">Mide siempre igual: en la mañana, antes de comer, con la cinta sin apretar.</p>
      {error && <p className="text-sm text-down">{error}</p>}
      <button onClick={save} disabled={saving} className="btn grad w-full">
        {saving ? <LoaderCircle size={20} className="animate-spin" /> : "Guardar"}
      </button>
      {existing && (
        <button onClick={remove} disabled={saving} className="btn w-full text-down">
          <Trash2 size={17} /> Eliminar el registro de este día
        </button>
      )}
    </div>
  );
}
