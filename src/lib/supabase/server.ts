import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente + id del usuario autenticado; redirige a /login si no hay sesión.
 * `cache` hace que el layout y la página compartan el mismo resultado en cada visita.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
});

const DEFAULT_PROFILE: Omit<Profile, "id"> = {
  display_name: null,
  avatar_url: null,
  unit_system: "kg",
  theme: "system",
  accent: "volt",
  weekly_goal: 4,
  default_rest_seconds: 90,
  timezone: "America/Bogota",
};

/** Perfil del usuario: una sola consulta por visita, compartida por layout y páginas. */
export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, unit_system, theme, accent, weekly_goal, default_rest_seconds, timezone")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? { id: userId, ...DEFAULT_PROFILE };
});
