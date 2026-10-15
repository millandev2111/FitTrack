"use client";

import { Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { exercisePhoto } from "@/lib/exercise-photos";

/** Miniatura cuadrada; los ejercicios propios (sin foto) muestran un icono. */
export function ExerciseThumb({ slug, size = 44, className = "" }: { slug?: string | null; size?: number; className?: string }) {
  const src = exercisePhoto(slug);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  if (!src) {
    return (
      <span className={`grid flex-none place-items-center bg-a1/12 text-a1 ${className}`} style={style} aria-hidden>
        <Dumbbell size={size * 0.45} />
      </span>
    );
  }
  return <img src={src} alt="" loading="lazy" decoding="async" className={`flex-none bg-surface-2 object-cover ${className}`} style={style} />;
}

/** Alterna la posición inicial y la final para mostrar el movimiento. */
export function ExerciseMotion({ slug, name, className = "" }: { slug?: string | null; name: string; className?: string }) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const start = exercisePhoto(slug, 0);
  const end = exercisePhoto(slug, 1);

  useEffect(() => {
    if (!start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1300);
    return () => clearInterval(id);
  }, [start]);

  if (!start || !end) return null;
  return (
    <figure className={`relative m-0 aspect-[3/2] w-full overflow-hidden rounded-[22px] bg-surface-2 ${className}`}>
      <img src={start} alt={`${name}: posición inicial`} className="absolute inset-0 size-full object-cover" />
      <img
        src={end}
        alt={`${name}: posición final`}
        className="absolute inset-0 size-full object-cover transition-opacity duration-500"
        style={{ opacity: frame === 1 ? 1 : 0 }}
      />
      <figcaption className="absolute bottom-2.5 left-2.5 flex gap-1">
        {[0, 1].map((i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${frame === i ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
        ))}
      </figcaption>
    </figure>
  );
}
