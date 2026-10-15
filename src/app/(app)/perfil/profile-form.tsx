"use client";

import { Bell, BookOpen, Check, ChevronRight, ListChecks, LogOut, Minus, Monitor, Moon, Plus, Ruler, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InstallCard } from "@/components/install-app";
import { useProfile } from "@/components/profile-provider";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { ACCENTS, type Accent, type ThemePref } from "@/lib/theme";
import type { Profile, Unit } from "@/lib/types";
import { signOut } from "../../(auth)/actions";

const THEMES: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: "system", label: "Sistema", Icon: Monitor },
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Oscuro", Icon: Moon },
];
const RESTS = [45, 60, 75, 90, 120, 150, 180];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3.5 last:border-0">
      <span className="min-w-0">
        <b className="block text-[14px]">{label}</b>
        {hint && <small className="text-xs text-sub">{hint}</small>}
      </span>
      {children}
    </div>
  );
}

export function ProfileForm({ email }: { email: string | null }) {
  const initial = useProfile();
  const router = useRouter();
  const { pref, accent, setPref, setAccent } = useTheme();
  const [profile, setProfile] = useState<Profile>(initial);
  const [name, setName] = useState(initial.display_name ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: Partial<Profile>, label: string) => {
    setProfile((p) => ({ ...p, ...patch }));
    setError(null);
    const { error: e } = await createClient().from("profiles").update(patch).eq("id", initial.id);
    if (e) {
      setError("No se pudo guardar el cambio. Revisa tu conexión.");
      return;
    }
    setSaved(label);
    setTimeout(() => setSaved((s) => (s === label ? null : s)), 1800);
    router.refresh();
  };

  const initials = (name || email || "FT")
    .split(/[\s@]/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[26px] font-bold tracking-tight">Perfil</h1>

      <section className="card flex items-center gap-3.5 p-4">
        {profile.avatar_url ? (
           
          <img src={profile.avatar_url} alt="" className="size-14 rounded-[18px] object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grad grid size-14 place-items-center rounded-[18px] font-display text-lg font-bold">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== (profile.display_name ?? "") && save({ display_name: name.trim() || null }, "name")}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            maxLength={60}
            className="w-full bg-transparent font-display text-lg font-semibold outline-none"
          />
          <small className="block truncate text-xs text-sub">{email}</small>
        </div>
        {saved === "name" && <Check size={18} className="text-up" />}
      </section>

      <InstallCard />

      <section className="card px-4 py-1">
        <Row label="Unidades" hint="Los pesos se guardan siempre igual; solo cambia cómo los ves.">
          <div className="seg w-[120px] flex-none">
            {(["kg", "lb"] as Unit[]).map((u) => (
              <button key={u} aria-pressed={profile.unit_system === u} onClick={() => save({ unit_system: u }, "unit")}>
                {u}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Meta semanal" hint="Días de entrenamiento por semana">
          <div className="flex flex-none items-center gap-1.5">
            <button onClick={() => profile.weekly_goal > 1 && save({ weekly_goal: profile.weekly_goal - 1 }, "goal")} className="grid size-8 place-items-center rounded-lg bg-surface-2" aria-label="Menos días">
              <Minus size={15} />
            </button>
            <span className="num w-6 text-center text-lg font-bold">{profile.weekly_goal}</span>
            <button onClick={() => profile.weekly_goal < 7 && save({ weekly_goal: profile.weekly_goal + 1 }, "goal")} className="grid size-8 place-items-center rounded-lg bg-surface-2" aria-label="Más días">
              <Plus size={15} />
            </button>
          </div>
        </Row>
        <Row label="Descanso por defecto" hint="Si el ejercicio o la rutina no definen otro">
          <select
            value={profile.default_rest_seconds}
            onChange={(e) => save({ default_rest_seconds: Number(e.target.value) }, "rest")}
            className="num flex-none rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold"
            aria-label="Descanso por defecto"
          >
            {RESTS.map((s) => (
              <option key={s} value={s}>
                {s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
              </option>
            ))}
          </select>
        </Row>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <b className="text-[14px]">Tema</b>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-pressed={pref === id}
              onClick={() => {
                setPref(id);
                void save({ theme: id }, "theme");
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-colors ${
                pref === id ? "border-a1 bg-a1/10 text-fg" : "border-line text-sub"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
        <b className="mt-1 text-[14px]">Color de acento</b>
        <div className="grid grid-cols-3 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              aria-pressed={accent === a.id}
              onClick={() => {
                setAccent(a.id as Accent);
                void save({ accent: a.id }, "accent");
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-colors ${
                accent === a.id ? "border-a1 bg-a1/10 text-fg" : "border-line text-sub"
              }`}
            >
              <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card flex flex-col px-4 py-1">
        <Link href="/rutinas" className="flex items-center gap-3 border-b border-line py-3.5">
          <ListChecks size={20} className="text-a1" />
          <b className="flex-1 text-[14px]">Mis rutinas</b>
          <ChevronRight size={18} className="text-sub" />
        </Link>
        <Link href="/cuerpo" className="flex items-center gap-3 border-b border-line py-3.5">
          <Ruler size={20} className="text-a1" />
          <b className="flex-1 text-[14px]">Peso, medidas y fotos</b>
          <ChevronRight size={18} className="text-sub" />
        </Link>
        <Link href="/recordatorios" className="flex items-center gap-3 border-b border-line py-3.5">
          <Bell size={20} className="text-a1" />
          <b className="flex-1 text-[14px]">Recordatorios</b>
          <ChevronRight size={18} className="text-sub" />
        </Link>
        <Link href={`/resumen/${new Date().toISOString().slice(0, 7)}`} className="flex items-center gap-3 border-b border-line py-3.5">
          <Sparkles size={20} className="text-a1" />
          <b className="flex-1 text-[14px]">Resumen del mes</b>
          <ChevronRight size={18} className="text-sub" />
        </Link>
        <Link href="/ejercicios" className="flex items-center gap-3 py-3.5">
          <BookOpen size={20} className="text-a1" />
          <b className="flex-1 text-[14px]">Catálogo de ejercicios</b>
          <ChevronRight size={18} className="text-sub" />
        </Link>
      </section>

      {error && <p className="text-center text-sm text-down">{error}</p>}

      <form action={signOut}>
        <button type="submit" className="btn w-full bg-down/12 text-down">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </form>
    </div>
  );
}
