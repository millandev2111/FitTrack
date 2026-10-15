import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { RemindersClient, type Reminder } from "./reminders-client";

export const metadata: Metadata = { title: "Recordatorios" };

export default async function RemindersPage() {
  const { supabase } = await requireUser();
  const [{ data: reminders }, { data: routines }] = await Promise.all([
    supabase.from("reminders").select("id, weekdays, time_of_day, message, enabled, routine_id").order("created_at"),
    supabase.from("routines").select("id, name").eq("archived", false).order("position"),
  ]);
  return <RemindersClient initial={(reminders ?? []) as Reminder[]} routines={routines ?? []} />;
}
