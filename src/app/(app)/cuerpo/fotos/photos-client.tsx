"use client";

import { Camera, ImagePlus, LoaderCircle, Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/text";

export type Pose = "front" | "side" | "back" | "other";
export type Photo = { id: string; taken_on: string; pose: Pose; storage_path: string; url: string | null };

const POSES: { id: Pose; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "side", label: "Lado" },
  { id: "back", label: "Espalda" },
  { id: "other", label: "Otra" },
];
const POSE_LABEL = Object.fromEntries(POSES.map((p) => [p.id, p.label])) as Record<Pose, string>;
const dayLabel = (d: string) => formatDate(`${d}T12:00:00Z`, "UTC");

/** Reduce la foto a 1280 px y JPEG para ahorrar espacio (el plan gratis trae 1 GB). */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (blob) return blob;
  } catch {}
  if (/image\/(jpeg|png|webp)/.test(file.type)) return file;
  throw new Error("formato");
}

export function PhotosClient({ photos, today }: { photos: Photo[]; today: string }) {
  const router = useRouter();
  const profile = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [pose, setPose] = useState<Pose>("front");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);

  // Comparación: misma pose, la fecha más antigua contra la más reciente por defecto.
  const [cmpPose, setCmpPose] = useState<Pose>("front");
  const datesForPose = useMemo(() => [...new Set(photos.filter((p) => p.pose === cmpPose).map((p) => p.taken_on))].sort(), [photos, cmpPose]);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const beforeDate = before && datesForPose.includes(before) ? before : datesForPose[0];
  const afterDate = after && datesForPose.includes(after) ? after : datesForPose[datesForPose.length - 1];
  const photoFor = (d: string | undefined) => photos.find((p) => p.pose === cmpPose && p.taken_on === d);
  const [split, setSplit] = useState(50);

  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>();
    photos.forEach((p) => map.set(p.taken_on, [...(map.get(p.taken_on) ?? []), p]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [photos]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compress(file);
      const supabase = createClient();
      const path = `${profile.id}/${date}-${pose}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { error: rowErr } = await supabase.from("progress_photos").insert({ user_id: profile.id, taken_on: date, pose, storage_path: path });
      if (rowErr) {
        await supabase.storage.from("progress-photos").remove([path]);
        throw rowErr;
      }
      setUploadOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message === "formato" ? "Ese formato de foto no se puede procesar. Prueba con una foto JPG o PNG." : "No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (p: Photo) => {
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.from("progress_photos").delete().eq("id", p.id);
    if (!e) await supabase.storage.from("progress-photos").remove([p.storage_path]);
    setBusy(false);
    if (e) return setError("No se pudo eliminar. Revisa tu conexión.");
    setViewing(null);
    router.refresh();
  };

  const b = photoFor(beforeDate);
  const a = photoFor(afterDate);

  return (
    <div className="flex flex-col gap-3.5">
      <button onClick={() => setUploadOpen(true)} className="btn grad w-full">
        <Camera size={18} /> Añadir foto
      </button>
      <p className="-mt-1 flex items-center justify-center gap-1.5 text-[11.5px] text-sub">
        <Lock size={12} /> Privadas: solo tú puedes verlas.
      </p>

      {photos.length === 0 ? (
        <div className="card px-6 py-8 text-center">
          <p className="font-display text-lg font-semibold">Tu primera foto de progreso</p>
          <p className="mt-1.5 text-sm leading-relaxed text-sub">
            Tómate una de frente, una de lado y una de espalda, con la misma luz y la misma ropa. Repite cada 2 a 4 semanas y compáralas aquí.
          </p>
        </div>
      ) : (
        <>
          <section className="card flex flex-col gap-3 p-3.5" aria-label="Comparar fotos">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold">Comparar</h2>
              <div className="seg w-[210px]">
                {POSES.slice(0, 3).map((p) => (
                  <button key={p.id} aria-pressed={cmpPose === p.id} onClick={() => setCmpPose(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {datesForPose.length < 2 ? (
              <p className="py-4 text-center text-sm text-sub">Necesitas fotos de {POSE_LABEL[cmpPose].toLowerCase()} en dos fechas distintas para compararlas.</p>
            ) : (
              <>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface-2 select-none">
                  {a?.url && <img src={a.url} alt={`Después, ${dayLabel(afterDate!)}`} className="absolute inset-0 size-full object-cover" />}
                  {b?.url && (
                    <img src={b.url} alt={`Antes, ${dayLabel(beforeDate!)}`} className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
                  )}
                  <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,.5)]" style={{ left: `${split}%` }} />
                  <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">Antes</span>
                  <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">Después</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={split}
                    onChange={(e) => setSplit(Number(e.target.value))}
                    aria-label="Deslizar para comparar"
                    className="absolute inset-0 size-full cursor-ew-resize opacity-0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Antes", value: beforeDate, set: setBefore },
                    { label: "Después", value: afterDate, set: setAfter },
                  ].map((f) => (
                    <label key={f.label} className="rounded-2xl border border-line bg-surface px-3 py-2">
                      <span className="block text-[10.5px] font-semibold text-sub">{f.label}</span>
                      <select value={f.value} onChange={(e) => f.set(e.target.value)} className="w-full appearance-none bg-transparent text-[14px] font-bold outline-none">
                        {datesForPose.map((d) => (
                          <option key={d} value={d}>
                            {dayLabel(d)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </>
            )}
          </section>

          {groups.map(([day, list]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold tracking-[.08em] text-sub uppercase">{dayLabel(day)}</h2>
              <div className="grid grid-cols-3 gap-2">
                {list.map((p) => (
                  <button key={p.id} onClick={() => setViewing(p)} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                    {p.url && <img src={p.url} alt={`${POSE_LABEL[p.pose]}, ${dayLabel(p.taken_on)}`} loading="lazy" className="size-full object-cover" />}
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-px text-[10px] font-semibold text-white">{POSE_LABEL[p.pose]}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {error && <p className="text-center text-sm text-down">{error}</p>}

      <Sheet open={uploadOpen} onClose={() => setUploadOpen(false)} title="Añadir foto">
        <div className="flex flex-col gap-3 pb-2">
          <label className="rounded-2xl border border-line bg-surface px-3 py-2">
            <span className="block text-[10.5px] font-semibold text-sub">Fecha</span>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="num w-full bg-transparent text-[15px] font-bold outline-none" />
          </label>
          <div className="seg" role="group" aria-label="Pose">
            {POSES.map((p) => (
              <button key={p.id} aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn grad w-full">
            {busy ? <LoaderCircle size={20} className="animate-spin" /> : <ImagePlus size={18} />}
            {busy ? "Subiendo…" : "Tomar o elegir foto"}
          </button>
          {error && <p className="text-sm text-down">{error}</p>}
        </div>
      </Sheet>

      <Sheet open={viewing != null} onClose={() => setViewing(null)} title={viewing ? `${POSE_LABEL[viewing.pose]} · ${dayLabel(viewing.taken_on)}` : undefined}>
        {viewing && (
          <div className="flex flex-col gap-3 pb-2">
            {viewing.url && <img src={viewing.url} alt="" className="max-h-[60dvh] w-full rounded-2xl object-contain" />}
            <button onClick={() => remove(viewing)} disabled={busy} className="btn w-full bg-down/12 text-down">
              <Trash2 size={17} /> Eliminar foto
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
