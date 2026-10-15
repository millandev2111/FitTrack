"use client";

import { Eye, EyeOff, LoaderCircle, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

const ICONS = { email: Mail, password: Lock, name: User } as const;

export function Field({
  name,
  type = "text",
  placeholder,
  autoComplete,
  defaultValue,
  icon,
}: {
  name: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  defaultValue?: string;
  icon: keyof typeof ICONS;
}) {
  const [show, setShow] = useState(false);
  const Icon = ICONS[icon];
  const isPassword = type === "password";
  return (
    <label className="field">
      <Icon size={19} aria-hidden />
      <input
        name={name}
        type={isPassword && show ? "text" : type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-label={placeholder}
        required={name !== "name"}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      )}
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn grad w-full" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" size={20} /> : children}
    </button>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-2xl px-3.5 py-3 text-sm leading-snug ${error ? "bg-down/15 text-down" : "bg-up/15 text-up"}`}
    >
      {error ?? message}
    </p>
  );
}
