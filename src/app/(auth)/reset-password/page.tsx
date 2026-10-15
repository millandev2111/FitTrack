"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { Field, FormAlert, SubmitButton } from "../auth-ui";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, undefined);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.03em]">
          Elige una contraseña <span className="grad-text">nueva</span>
        </h1>
        <p className="mt-2 text-[15px] text-sub">Usa al menos 8 caracteres.</p>
      </div>
      <form action={action} className="flex flex-col gap-2.5">
        <Field name="password" type="password" icon="password" placeholder="Contraseña nueva" autoComplete="new-password" />
        <FormAlert error={state?.error} />
        <SubmitButton>Guardar y entrar</SubmitButton>
      </form>
    </div>
  );
}
