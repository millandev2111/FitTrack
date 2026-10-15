"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Field, FormAlert, SubmitButton } from "../auth-ui";

const LINK_ERRORS: Record<string, string> = {
  link: "El enlace no es válido o ya expiró. Pide uno nuevo.",
};

export function LoginForm({ next, errorCode, confirmed }: { next?: string; errorCode?: string; confirmed?: boolean }) {
  const [state, action] = useActionState(signIn, undefined);
  const error = state?.error ?? (errorCode ? LINK_ERRORS[errorCode] : undefined);

  return (
    <div className="flex flex-col gap-2.5">
      <form action={action} className="flex flex-col gap-2.5">
        <input type="hidden" name="next" value={next ?? "/"} />
        <Field name="email" type="email" icon="email" placeholder="tu@correo.com" autoComplete="email" defaultValue={state?.email} />
        <Field name="password" type="password" icon="password" placeholder="Contraseña" autoComplete="current-password" />
        <div className="-mt-0.5 text-right">
          <Link href="/recuperar" className="text-[13px] font-semibold text-sub">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <FormAlert error={error} message={!error && confirmed ? "Cuenta confirmada. Ya puedes iniciar sesión." : undefined} />
        <SubmitButton>Iniciar sesión</SubmitButton>
      </form>
      <Link href="/registro" className="btn btn-ghost w-full">
        Crear una cuenta
      </Link>
    </div>
  );
}
