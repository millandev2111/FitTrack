import type { Unit } from "./types";

export const BARS: Record<Unit, { value: number; label: string }[]> = {
  kg: [
    { value: 20, label: "Barra olímpica 20 kg" },
    { value: 15, label: "Barra 15 kg" },
    { value: 10, label: "Barra Z / corta 10 kg" },
    { value: 0, label: "Sin barra (máquina)" },
  ],
  lb: [
    { value: 45, label: "Barra olímpica 45 lb" },
    { value: 35, label: "Barra 35 lb" },
    { value: 25, label: "Barra Z / corta 25 lb" },
    { value: 0, label: "Sin barra (máquina)" },
  ],
};

export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/** Colores tipo competición para reconocer cada disco de un vistazo. */
export const PLATE_STYLE: Record<string, { bg: string; fg: string; h: number }> = {
  "kg-25": { bg: "#e5383b", fg: "#fff", h: 100 },
  "kg-20": { bg: "#2f6fed", fg: "#fff", h: 100 },
  "kg-15": { bg: "#f2c12e", fg: "#2a1a00", h: 92 },
  "kg-10": { bg: "#2fb36d", fg: "#fff", h: 84 },
  "kg-5": { bg: "#f4f4f6", fg: "#16182c", h: 66 },
  "kg-2.5": { bg: "#1f2233", fg: "#fff", h: 54 },
  "kg-1.25": { bg: "#9aa0b4", fg: "#16182c", h: 46 },
  "lb-45": { bg: "#2f6fed", fg: "#fff", h: 100 },
  "lb-35": { bg: "#f2c12e", fg: "#2a1a00", h: 92 },
  "lb-25": { bg: "#2fb36d", fg: "#fff", h: 82 },
  "lb-10": { bg: "#f4f4f6", fg: "#16182c", h: 64 },
  "lb-5": { bg: "#1f2233", fg: "#fff", h: 54 },
  "lb-2.5": { bg: "#9aa0b4", fg: "#16182c", h: 46 },
};

/** Discos por lado (de más pesado a más liviano) y lo que no se puede completar. */
export function platesPerSide(total: number, bar: number, available: number[]): { plates: number[]; remainder: number } {
  let perSide = (total - bar) / 2;
  if (perSide <= 0) return { plates: [], remainder: Math.max(0, total - bar) };
  const plates: number[] = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (perSide >= p - 1e-9) {
      plates.push(p);
      perSide = Math.round((perSide - p) * 1000) / 1000;
    }
  }
  return { plates, remainder: Math.round(perSide * 2 * 1000) / 1000 };
}
