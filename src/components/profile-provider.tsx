"use client";

import { createContext, useContext, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { ACCENT_KEY, THEME_KEY } from "@/lib/theme";
import { useTheme } from "./theme-provider";

const ProfileContext = createContext<Profile | null>(null);
export const PROFILE_CACHE_KEY = "ft-profile";

export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const { setPref, setAccent } = useTheme();

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      // En un dispositivo nuevo, usa el tema guardado en tu perfil.
      if (!localStorage.getItem(THEME_KEY)) setPref(profile.theme);
      if (!localStorage.getItem(ACCENT_KEY)) setAccent(profile.accent);
    } catch {}
    // Guarda tu zona horaria para que los días entrenados cuadren con tu calendario.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== profile.timezone) {
      void createClient().from("profiles").update({ timezone: tz }).eq("id", profile.id);
    }
    // Solo al cargar el perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  return <ProfileContext value={profile}>{children}</ProfileContext>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile debe usarse dentro de ProfileProvider");
  return ctx;
}
