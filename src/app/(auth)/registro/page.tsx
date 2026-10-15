"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { Field, FormAlert, SubmitButton } from "../auth-ui";

export default function RegisterPage() {
  const [state, action] = useActionState(signUp, undefined);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Link href="/login" className="icon-btn mt-2" aria-label="Volver">
        <ArrowLeft size={20} />
      </Link>
      <div>
        <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.03em]">
          Crea tu <span className="grad-text">cuenta</span>
        </h1>
        <p className="mt-2 text-[15px] text-sub">Tus entrenos quedan guardados y sincronizados en todos tus dispositivos.</p>
      </div>
      {state?.message ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <span className="grad grid size-14 place-items-center rounded-[18px]">
            <MailCheck size={26} />
          </span>
          <b className="font-display text-lg">Revisa tu correo</b>
          <p className="text-sm leading-relaxed text-sub">{state.message}</p>
          <Link href="/login" className="btn btn-ghost mt-1 w-full">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-2.5">
          <Field name="name" icon="name" placeholder="Tu nombre" autoComplete="given-name" defaultValue={state?.name} />
          <Field name="email" type="email" icon="email" placeholder="tu@correo.com" autoComplete="email" defaultValue={state?.email} />
          <Field name="password" type="password" icon="password" placeholder="Contraseña (mín. 8 caracteres)" autoComplete="new-password" />
          <Field name="confirm" type="password" icon="password" placeholder="Repite la contraseña" autoComplete="new-password" />
          <FormAlert error={state?.error} />
          <SubmitButton>Crear cuenta</SubmitButton>
        </form>
      )}
      <p className="mt-auto text-center text-[13px] text-sub">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-fg">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
