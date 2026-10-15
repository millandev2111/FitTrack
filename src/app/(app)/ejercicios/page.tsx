import type { Metadata } from "next";
import { Catalog } from "./catalog";
import { BackButton } from "@/components/back-button";

export const metadata: Metadata = { title: "Ejercicios" };

export default function ExercisesPage() {
  return (
    <div className="flex flex-col gap-3">
      <BackButton fallback="/progreso" />
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight">Ejercicios</h1>
        <p className="text-sm text-sub">Toca uno para ver tu progreso y tus récords.</p>
      </div>
      <Catalog />
    </div>
  );
}
