"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { leaveTo } from "@/lib/nav-history";
import { createClient } from "@/lib/supabase/client";

export function DeleteWorkout({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    const { error: e } = await createClient().from("workouts").delete().eq("id", id);
    if (e) {
      setError("No se pudo eliminar. Revisa tu conexión.");
      return;
    }
    leaveTo(router, "/historial");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="icon-btn text-down" aria-label="Eliminar entrenamiento">
        <Trash2 size={18} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="¿Eliminar entrenamiento?">
        <div className="flex flex-col gap-2.5 pb-2">
          <p className="text-sm text-sub">Se borran sus series y los récords que logró. No se puede deshacer.</p>
          {error && <p className="text-sm text-down">{error}</p>}
          <button onClick={remove} className="btn w-full bg-down text-white">
            Eliminar
          </button>
          <button onClick={() => setOpen(false)} className="btn btn-ghost w-full">
            Cancelar
          </button>
        </div>
      </Sheet>
    </>
  );
}
