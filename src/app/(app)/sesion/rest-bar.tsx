"use client";

import { SkipForward } from "lucide-react";
import { useEffect, useRef } from "react";
import { beep, useNow } from "@/lib/hooks";
import { formatDuration } from "@/lib/text";

export type RestState = { endsAt: number; total: number } | null;

export function RestBar({ rest, onChange }: { rest: RestState; onChange: (r: RestState) => void }) {
  const now = useNow(250);
  const fired = useRef<number | null>(null);
  const remaining = rest ? rest.endsAt - now : 0;
  const done = rest != null && remaining <= 0;

  useEffect(() => {
    if (!rest || !done || fired.current === rest.endsAt) return;
    fired.current = rest.endsAt;
    beep();
    const t = setTimeout(() => onChange(null), 4000);
    return () => clearTimeout(t);
  }, [done, rest, onChange]);

  if (!rest) return null;
  const progress = done ? 1 : 1 - remaining / (rest.total * 1000);
  const C = 2 * Math.PI * 21;

  const add = (s: number) => {
    const endsAt = Math.max(Date.now(), rest.endsAt) + s * 1000;
    onChange({ endsAt, total: Math.max(5, rest.total + s) });
  };

  return (
    <div
      className="glass pop-in fixed inset-x-3 z-40 mx-auto flex max-w-[430px] items-center gap-3 rounded-3xl py-3 pr-3 pl-3.5"
      style={{ bottom: "max(env(safe-area-inset-bottom), 14px)" }}
      role="timer"
      aria-live="polite"
    >
      <svg width="52" height="52" viewBox="0 0 52 52" className="flex-none" aria-hidden>
        <defs>
          <linearGradient id="rest-g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--a1)" />
            <stop offset="1" stopColor="var(--a2)" />
          </linearGradient>
        </defs>
        <circle cx="26" cy="26" r="21" fill="none" stroke="var(--surface-2)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r="21"
          fill="none"
          stroke={done ? "var(--up)" : "url(#rest-g)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.min(1, Math.max(0, progress)))}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <small className="block text-[11px] text-sub">{done ? "Descanso terminado" : "Descanso"}</small>
        <b className={`num text-[22px] font-bold ${done ? "text-up" : ""}`}>{done ? "¡Vamos!" : formatDuration(remaining)}</b>
      </div>
      {!done && (
        <>
          <button onClick={() => add(-15)} className="grid size-10 place-items-center rounded-[13px] bg-surface-2 text-xs font-bold" aria-label="Restar 15 segundos">
            −15
          </button>
          <button onClick={() => add(15)} className="grid size-10 place-items-center rounded-[13px] bg-surface-2 text-xs font-bold" aria-label="Sumar 15 segundos">
            +15
          </button>
        </>
      )}
      <button onClick={() => onChange(null)} className="grad grid size-10 place-items-center rounded-[13px]" aria-label="Saltar descanso">
        <SkipForward size={19} />
      </button>
    </div>
  );
}
