"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseFilter, filterExercises, useExercises } from "@/components/exercise-picker";
import { ExerciseThumb } from "@/components/exercise-photo";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/labels";

export function Catalog() {
  const { list, loading } = useExercises();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const filtered = useMemo(() => filterExercises(list, query, family), [list, query, family]);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 bg-bg/90 px-4 pt-1 pb-1 backdrop-blur-md [&_.-mx-5]:-mx-4 [&_.px-5]:px-4">
        <ExerciseFilter list={list} query={query} setQuery={setQuery} family={family} setFamily={setFamily} />
      </div>
      {loading && list.length === 0 && <LoaderCircle className="mx-auto animate-spin text-sub" />}
      <ul className="card flex flex-col px-3.5 py-1">
        {filtered.map((ex) => (
          <li key={ex.id}>
            <Link href={`/ejercicios/${ex.id}`} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
              <ExerciseThumb slug={ex.slug} size={48} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[14.5px]">{ex.name}</b>
                <small className="text-xs text-sub">
                  {MUSCLE_LABEL[ex.primary_muscle]} · {EQUIPMENT_LABEL[ex.equipment]}
                  {ex.user_id ? " · Tuyo" : ""}
                </small>
              </span>
              <ChevronRight size={18} className="text-sub" />
            </Link>
          </li>
        ))}
        {!loading && filtered.length === 0 && <li className="py-6 text-center text-sm text-sub">Ningún ejercicio coincide con tu búsqueda.</li>}
      </ul>
    </div>
  );
}
