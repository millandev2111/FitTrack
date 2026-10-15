import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, confirmed } = await searchParams;
  return (
    <div className="flex flex-1 flex-col justify-between gap-10">
      <div className="mt-4">
        <Brand />
      </div>
      <div>
        <h1 className="mb-3.5 font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em]">
          Cada serie
          <br />
          <span className="grad-text">cuenta.</span>
        </h1>
        <p className="max-w-[30ch] text-[15px] leading-relaxed text-sub">
          Registra tus entrenos, rompe tus marcas y mira cómo avanzas semana a semana.
        </p>
      </div>
      <LoginForm next={typeof next === "string" ? next : undefined} errorCode={typeof error === "string" ? error : undefined}
        confirmed={confirmed === "1"}
      />
    </div>
  );
}
