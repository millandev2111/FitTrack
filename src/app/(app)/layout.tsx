import { connection } from "next/server";
import { NavHistory } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileProvider } from "@/components/profile-provider";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, unit_system, theme, accent, weekly_goal, default_rest_seconds, timezone")
    .eq("id", userId)
    .maybeSingle();
  const profile: Profile = data ?? { id: userId, ...DEFAULT_PROFILE };

  return (
    <ProfileProvider profile={profile}>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-36">
        {children}
      </main>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-bg/90 backdrop-blur-md" style={{ height: "env(safe-area-inset-top)" }} />
      <BottomNav />
      <NavHistory />
    </ProfileProvider>
  );
}
