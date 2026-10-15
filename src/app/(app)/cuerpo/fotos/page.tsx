import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";
import { localDate } from "@/lib/progress";
import { requireUser } from "@/lib/supabase/server";
import { BodyTabs } from "../body-tabs";
import { PhotosClient, type Photo } from "./photos-client";

export const metadata: Metadata = { title: "Fotos de progreso" };

export default async function PhotosPage() {
  const { supabase, userId } = await requireUser();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.from("progress_photos").select("id, taken_on, pose, storage_path").order("taken_on", { ascending: false }).limit(300),
  ]);
  const rows = (data ?? []) as Omit<Photo, "url">[];

  // El bucket es privado: se firman enlaces temporales (1 hora) solo para ti.
  const urls = new Map<string, string>();
  if (rows.length) {
    const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrls(
      rows.map((r) => r.storage_path),
      3600,
    );
    (signed ?? []).forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const photos: Photo[] = rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <BackButton fallback="/progreso" />
        <h1 className="font-display text-[26px] font-bold tracking-tight">Cuerpo</h1>
      </div>
      <BodyTabs />
      <PhotosClient photos={photos} today={localDate(new Date(), profile?.timezone ?? "America/Bogota")} />
    </div>
  );
}
