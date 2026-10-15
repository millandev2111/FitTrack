export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("xxxx") && SUPABASE_KEY.length > 20;
