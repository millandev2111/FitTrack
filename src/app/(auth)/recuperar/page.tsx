"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Field, FormAlert, SubmitButton } from "../auth-ui";

export default function RecoverPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Link href="/login" className="icon-btn mt-2" aria-label="Volver">
        <ArrowLeft size={20} />
      </Link>
      <div>
        <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.03em]">Recupera tu contraseña</h1>
        <p className="mt-2 text-[15px] text-sub">Te enviamos un enlace para elegir una nueva.</p>
      </div>
      <form action={action} className="flex flex-col gap-2.5">
        <Field name="email" type="email" icon="email" placeholder="tu@correo.com" autoComplete="email" defaultValue={state?.email} />
        <FormAlert error={state?.error} message={state?.message} />
        <SubmitButton>Enviar enlace</SubmitButton>
      </form>
    </div>
  );
}
