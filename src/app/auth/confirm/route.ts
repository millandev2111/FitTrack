import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Enlaces de los correos: confirmar cuenta y restablecer contraseña.
// Acepta las dos formas que puede usar Supabase:
//  - plantilla personalizada: ?token_hash=...&type=email|recovery
//  - plantilla por defecto:   ?code=... (después de pasar por Supabase)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${type === "recovery" ? "/reset-password" : next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // El enlace se abrió en otro navegador: la cuenta ya quedó confirmada, solo falta entrar.
    return NextResponse.redirect(`${origin}/login?confirmed=1`);
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
