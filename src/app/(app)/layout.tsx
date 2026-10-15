import { connection } from "next/server";
import { NavHistory } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileProvider } from "@/components/profile-provider";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProfile } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  if (!isSupabaseConfigured) return <SetupNotice />;

  const profile = await getProfile();

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
