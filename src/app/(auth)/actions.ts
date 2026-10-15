"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string; name?: string } | undefined;

async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function translate(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Inicia sesión.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";
    case "same_password":
      return "La contraseña nueva debe ser distinta a la anterior.";
    case "email_address_not_authorized":
      return "El correo gratuito de Supabase solo envía a los correos de tu equipo. Usa el correo de tu cuenta de Supabase.";
    default:
      return "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.";
  }
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error), email };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const keep = { email, name };
  if (!email || !password) return { error: "Escribe tu correo y una contraseña.", ...keep };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres.", ...keep };
  if (password !== confirm) return { error: "Las contraseñas no coinciden.", ...keep };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name || undefined },
      emailRedirectTo: `${await getOrigin()}/auth/confirm`,
    },
  });
  if (error) return { error: translate(error), ...keep };
  // Supabase no da error si el correo ya está registrado: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.", ...keep };
  }
  // Con "Confirm email" desactivado en Supabase, entra directo.
  if (data.session) redirect("/");

  return { message: `Te enviamos un correo a ${email}. Toca el enlace para activar tu cuenta y luego inicia sesión.`, ...keep };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe el correo de tu cuenta." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: translate(error), email };
  return { message: "Si el correo tiene una cuenta, te llegará un enlace para elegir una contraseña nueva.", email };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error) };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
