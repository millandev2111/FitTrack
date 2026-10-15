import { connection } from "next/server";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  await connection();
  if (!isSupabaseConfigured) return <SetupNotice />;
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="glow" />
      <div className="glow" style={{ left: "30%", right: "-60%", top: -60, background: "radial-gradient(closest-side, color-mix(in srgb, var(--a2) 50%, transparent), transparent)" }} />
      <main className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        {children}
      </main>
    </div>
  );
}
