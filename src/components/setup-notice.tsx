import { Brand } from "./brand";

export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Brand />
      <div className="card flex flex-col gap-3 p-5">
        <h1 className="font-display text-xl font-bold">Falta conectar Supabase</h1>
        <p className="text-sm leading-relaxed text-sub">
          Crea el archivo <code className="rounded bg-surface-2 px-1.5 py-0.5">.env.local</code> en la raíz del
          proyecto con la URL y la Publishable key de tu proyecto de Supabase, y reinicia{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">npm run dev</code>.
        </p>
        <p className="text-sm leading-relaxed text-sub">
          Los pasos completos están en <code className="rounded bg-surface-2 px-1.5 py-0.5">docs/supabase-setup.md</code>.
        </p>
      </div>
    </main>
  );
}
