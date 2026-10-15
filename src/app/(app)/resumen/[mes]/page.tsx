import { ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, Layers, Medal, Star, Trophy, Weight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ExerciseThumb } from "@/components/exercise-photo";
import { PR_LABEL } from "@/lib/labels";
import { monthLabel, shiftMonth, summarizeMonth } from "@/lib/month-summary";
import { localDate } from "@/lib/progress";
import { requireUser } from "@/lib/supabase/server";
import type { Unit } from "@/lib/types";
import { formatNumber, formatVolume, formatWeight } from "@/lib/units";

export const metadata: Metadata = { title: "Resumen del mes" };

function Change({ now, before, suffix = "" }: { now: number; before: number; suffix?: string }) {
  if (before === 0 && now === 0) return null;
  if (before === 0) return <span className="text-[11px] font-semibold text-white/80">nuevo este mes</span>;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 1) return <span className="text-[11px] font-semibold text-white/80">igual que el mes pasado{suffix}</span>;
  return (
    <span className="text-[11px] font-semibold text-white/85">
      {pct > 0 ? "+" : "−"}
      {formatNumber(Math.abs(pct), 0)} % vs. mes pasado{suffix}
    </span>
  );
}

export default async function MonthSummaryPage({ params }: PageProps<"/resumen/[mes]">) {
  const { mes } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) notFound();
  const { supabase, userId } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("unit_system, timezone").eq("id", userId).maybeSingle();
  const unit = (profile?.unit_system ?? "kg") as Unit;
  const tz = profile?.timezone ?? "America/Bogota";
  const currentMonth = localDate(new Date(), tz).slice(0, 7);
  if (mes > currentMonth) notFound();

  const [s, prev] = await Promise.all([summarizeMonth(supabase, mes, tz), summarizeMonth(supabase, shiftMonth(mes, -1), tz)]);
  const label = monthLabel(mes);
  const isCurrent = mes === currentMonth;
  const maxMuscle = Math.max(1, ...s.muscles.map((m) => m.sets));

  const tiles = [
    { Icon: Dumbbell, label: "entrenamientos", value: String(s.workouts) },
    { Icon: Layers, label: "series", value: formatNumber(s.sets, 0) },
    { Icon: Weight, label: "volumen levantado", value: formatVolume(s.volumeKg, unit) },
    { Icon: Trophy, label: "récords", value: String(s.prs) },
    { Icon: Clock, label: "horas entrenando", value: formatNumber(s.minutes / 60, 1) },
    { Icon: Flame, label: "racha más larga", value: `${s.longestStreak} días` },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <BackButton fallback="/progreso" />
        <div className="flex gap-1.5">
          <Link href={`/resumen/${shiftMonth(mes, -1)}`} className="icon-btn" aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </Link>
          {!isCurrent && (
            <Link href={`/resumen/${shiftMonth(mes, 1)}`} className="icon-btn" aria-label="Mes siguiente">
              <ChevronRight size={20} />
            </Link>
          )}
        </div>
      </div>

      <section className="grad relative overflow-hidden rounded-[28px] p-5">
        <Star size={150} className="pointer-events-none absolute -top-8 -right-10 rotate-12 opacity-15" />
        <p className="text-[11px] font-bold tracking-[.14em] uppercase opacity-80">{isCurrent ? "Tu mes hasta hoy" : "Resumen del mes"}</p>
        <h1 className="mt-1 font-display text-[34px] leading-none font-extrabold tracking-tight capitalize">{label}</h1>
        <div className="mt-5 flex items-end gap-2">
          <span className="num text-[64px] leading-[0.85] font-extrabold tracking-tighter">{s.days}</span>
          <span className="pb-1 text-sm font-semibold opacity-90">{s.days === 1 ? "día entrenado" : "días entrenados"}</span>
        </div>
        <div className="mt-2">
          <Change now={s.days} before={prev.days} />
        </div>
      </section>

      {s.days === 0 ? (
        <div className="card p-5 text-center text-sm text-sub">No hay entrenamientos ni deportes registrados en {label}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {tiles.map((t) => (
              <div key={t.label} className="card p-3.5">
                <t.Icon size={18} className="mb-2 text-a1" />
                <b className="num block text-[22px] leading-tight font-bold">{t.value}</b>
                <small className="text-[11.5px] text-sub">{t.label}</small>
              </div>
            ))}
          </div>

          {s.bestPr && (
            <Link href={`/ejercicios/${s.bestPr.exerciseId}`} className="flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-warm to-gold p-4 text-[#2a1300]">
              <Medal size={34} className="flex-none" />
              <span className="min-w-0 flex-1">
                <small className="block text-[11px] font-bold tracking-wide uppercase opacity-75">Tu mayor salto</small>
                <b className="block truncate font-display text-[17px]">{s.bestPr.exercise}</b>
                <span className="text-[12.5px] font-semibold opacity-85">
                  {PR_LABEL[s.bestPr.type]}: {formatWeight(s.bestPr.previous, unit)} → {formatWeight(s.bestPr.value, unit)} (+{formatNumber(s.bestPr.gainPct, 1)} %)
                </span>
              </span>
            </Link>
          )}

          {s.starExercise && (
            <Link href={`/ejercicios/${s.starExercise.id}`} className="card flex items-center gap-3 p-3.5">
              <ExerciseThumb slug={s.starExercise.slug} size={52} />
              <span className="min-w-0 flex-1">
                <small className="block text-[11px] font-bold tracking-wide text-sub uppercase">Ejercicio estrella</small>
                <b className="block truncate text-[15px]">{s.starExercise.name}</b>
                <span className="text-xs text-sub">{s.starExercise.sets} series este mes</span>
              </span>
            </Link>
          )}

          {s.muscles.length > 0 && (
            <section className="card p-4">
              <h2 className="font-display text-[15px] font-semibold">Lo que más trabajaste</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {s.muscles.map((m) => (
                  <li key={m.label} className="grid grid-cols-[64px_1fr_32px] items-center gap-2 text-[12px]">
                    <span className="font-semibold">{m.label}</span>
                    <span className="h-2.5 rounded-full bg-surface-2">
                      <i className="block h-full rounded-full bg-gradient-to-r from-a1 to-a2" style={{ width: `${(m.sets / maxMuscle) * 100}%` }} />
                    </span>
                    <b className="num text-right">{m.sets}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s.activities.count > 0 && (
            <section className="card flex items-center gap-3 p-4">
              <span className="grad-warm grid size-12 flex-none place-items-center rounded-2xl">
                <Flame size={22} />
              </span>
              <span className="min-w-0 flex-1 text-[13px]">
                <b className="block text-[15px]">
                  {s.activities.count} {s.activities.count === 1 ? "actividad deportiva" : "actividades deportivas"}
                </b>
                <span className="text-sub">
                  {formatNumber(s.activities.minutes / 60, 1)} h · {formatNumber(s.activities.calories, 0)} kcal
                  {s.activities.favorite ? ` · tu favorito: ${s.activities.favorite}` : ""}
                </span>
              </span>
            </section>
          )}

          <section className="card p-4 text-[13px]">
            <h2 className="mb-2 font-display text-[15px] font-semibold">Comparado con {monthLabel(shiftMonth(mes, -1))}</h2>
            {[
              { label: "Entrenamientos", now: s.workouts, before: prev.workouts, fmt: (v: number) => String(v) },
              { label: "Series", now: s.sets, before: prev.sets, fmt: (v: number) => formatNumber(v, 0) },
              { label: "Volumen", now: s.volumeKg, before: prev.volumeKg, fmt: (v: number) => formatVolume(v, unit) },
              { label: "Récords", now: s.prs, before: prev.prs, fmt: (v: number) => String(v) },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between border-b border-line py-2 last:border-0">
                <span className="text-sub">{r.label}</span>
                <span className="num font-semibold">
                  <span className="text-sub">{r.fmt(r.before)}</span> → {r.fmt(r.now)}
                  {r.now !== r.before && (
                    <span className={`ml-2 text-[11px] font-bold ${r.now > r.before ? "text-up" : "text-down"}`}>{r.now > r.before ? "▲" : "▼"}</span>
                  )}
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
