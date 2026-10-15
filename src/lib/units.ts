import type { Unit } from "./types";

export const KG_PER_LB = 0.45359237;

const nf = (max: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: max });
const fmt1 = nf(1);
const fmt2 = nf(2);
const fmt0 = nf(0);

/** kg guardados → número en la unidad del usuario (redondeado para mostrar). */
export function toUnit(kg: number | null | undefined, unit: Unit): number | null {
  if (kg == null) return null;
  const value = unit === "kg" ? kg : kg / KG_PER_LB;
  return Math.round(value * (unit === "kg" ? 100 : 10)) / (unit === "kg" ? 100 : 10);
}

/** Valor escrito por el usuario en su unidad → kg para guardar. */
export function fromUnit(value: number | null, unit: Unit): number | null {
  if (value == null) return null;
  return unit === "kg" ? value : Math.round(value * KG_PER_LB * 1000) / 1000;
}

export function formatNumber(n: number | null | undefined, maxDecimals = 2): string {
  if (n == null || Number.isNaN(n)) return "–";
  return (maxDecimals === 0 ? fmt0 : maxDecimals === 1 ? fmt1 : fmt2).format(n);
}

export function formatWeight(kg: number | null | undefined, unit: Unit, withUnit = true): string {
  const v = toUnit(kg ?? null, unit);
  if (v == null) return "–";
  return withUnit ? `${formatNumber(v, unit === "kg" ? 2 : 1)} ${unit}` : formatNumber(v, unit === "kg" ? 2 : 1);
}

/** Volumen grande: 1.840 kg, 12,4 t */
export function formatVolume(kg: number, unit: Unit): string {
  const v = toUnit(kg, unit) ?? 0;
  if (v >= 100_000) return `${formatNumber(v / 1000, 1)} ${unit === "kg" ? "t" : "k lb"}`;
  return `${formatNumber(v, 0)} ${unit}`;
}

/** Acepta "62,5" o "62.5". */
export function parseDecimal(input: string): number | null {
  const clean = input.trim().replace(",", ".");
  if (clean === "") return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Incremento típico de carga según equipo y unidad. */
export function weightStep(equipment: string, unit: Unit): number {
  if (unit === "lb") return 5;
  if (equipment === "dumbbell" || equipment === "kettlebell") return 2;
  if (equipment === "machine" || equipment === "cable") return 2.5;
  return 2.5;
}
