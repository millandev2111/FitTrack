import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import type { Trend } from "@/lib/progress";

export function TrendChip({ trend }: { trend: Trend | null }) {
  if (!trend) return <span className="chip bg-surface-2 text-sub">Primera vez</span>;
  if (trend === "up")
    return (
      <span className="chip chip-up">
        <ArrowUp size={13} strokeWidth={3} /> Subiste
      </span>
    );
  if (trend === "down")
    return (
      <span className="chip chip-down">
        <ArrowDown size={13} strokeWidth={3} /> Bajaste
      </span>
    );
  return (
    <span className="chip chip-same">
      <Equal size={13} strokeWidth={3} /> Igual
    </span>
  );
}
