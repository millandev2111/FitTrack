"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, parseDecimal } from "@/lib/units";

/** Celda numérica que acepta "62,5" mientras escribes y guarda en cada cambio válido. */
export function NumberCell({
  value,
  onChange,
  placeholder,
  decimals = 2,
  integer = false,
  label,
  className = "",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  decimals?: number;
  integer?: boolean;
  label: string;
  className?: string;
}) {
  const show = (v: number | null) => (v == null ? "" : formatNumber(v, integer ? 0 : decimals).replace(/\./g, ""));
  const [text, setText] = useState(show(value));
  const focused = useRef(false);

  useEffect(() => {
    // Refleja cambios externos (p. ej. aplicar una sugerencia) cuando no estás escribiendo.
    if (!focused.current) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      aria-label={label}
      inputMode={integer ? "numeric" : "decimal"}
      enterKeyHint="done"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, "");
        setText(raw);
        if (raw === "") return onChange(null);
        const n = parseDecimal(raw);
        if (n != null) onChange(integer ? Math.round(n) : n);
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`h-[34px] w-full min-w-0 rounded-[11px] text-center font-display text-[15px] font-semibold tabular-nums outline-none placeholder:text-sub/60 ${className}`}
    />
  );
}
