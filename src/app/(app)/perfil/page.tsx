import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return <ProfileForm email={email} />;
}
