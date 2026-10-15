"use client";

import { CheckCircle2, Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { installState, onInstallChange, promptInstall, type InstallState } from "@/lib/install";
import { Logo } from "./brand";
import { Sheet } from "./sheet";

const DISMISS_KEY = "ft-install-dismissed";

function useInstall() {
  const [state, setState] = useState<InstallState | null>(null);
  useEffect(() => {
    const update = () => setState(installState());
    update();
    return onInstallChange(update);
  }, []);
  return state;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grad grid size-7 flex-none place-items-center rounded-full text-[13px] font-bold">{n}</span>
      <span className="pt-0.5 text-[14.5px] leading-snug">{children}</span>
    </li>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="mx-0.5 inline-flex items-center gap-1 rounded-lg bg-surface-2 px-1.5 py-0.5 align-middle text-[13px] font-semibold">{children}</span>;
}

export function InstallInstructions({ state }: { state: InstallState }) {
  if (state === "ios") {
    return (
      <ol className="flex flex-col gap-3.5">
        <Step n={1}>
          Abre FitTracker en <b>Safari</b> y toca <Pill><Share size={14} /> Compartir</Pill> en la barra de abajo (en Chrome está arriba, junto a la dirección).
        </Step>
        <Step n={2}>
          Desliza y toca <Pill><SquarePlus size={14} /> Añadir a pantalla de inicio</Pill>.
        </Step>
        <Step n={3}>
          Toca <b>Añadir</b>. FitTracker queda como una app más: ábrela siempre desde su ícono.
        </Step>
      </ol>
    );
  }
  if (state === "android-manual") {
    return (
      <ol className="flex flex-col gap-3.5">
        <Step n={1}>
          Abre FitTracker en <b>Chrome</b> y toca el menú <Pill><EllipsisVertical size={14} /></Pill> arriba a la derecha.
        </Step>
        <Step n={2}>
          Toca <Pill><Download size={14} /> Instalar app</Pill> (o <b>Añadir a pantalla de inicio</b>).
        </Step>
        <Step n={3}>Confirma. Aparecerá en tu cajón de apps como cualquier otra.</Step>
      </ol>
    );
  }
  return (
    <ol className="flex flex-col gap-3.5">
      <Step n={1}>
        En Chrome o Edge, toca el ícono <Pill><Download size={14} /> Instalar</Pill> al final de la barra de direcciones.
      </Step>
      <Step n={2}>En el celular es mejor: abre la app desde el navegador de tu teléfono y sigue los pasos que aparecen ahí.</Step>
    </ol>
  );
}

/** Tarjeta para Perfil: estado de instalación y cómo hacerlo. */
export function InstallCard() {
  const state = useInstall();
  const [help, setHelp] = useState(false);
  if (!state) return null;

  const install = async () => {
    if (state === "prompt") await promptInstall();
    else setHelp(true);
  };

  return (
    <section className="card flex items-center gap-3 p-4">
      <Logo size={42} />
      <span className="min-w-0 flex-1">
        <b className="block text-[14.5px]">{state === "installed" ? "App instalada" : "Instala FitTracker"}</b>
        <small className="text-[12px] leading-snug text-sub">
          {state === "installed" ? "Estás usando la app desde tu pantalla de inicio." : "Ábrela como una app, a pantalla completa y sin conexión."}
        </small>
      </span>
      {state === "installed" ? (
        <CheckCircle2 size={22} className="flex-none text-up" />
      ) : (
        <button onClick={install} className="btn grad h-10 flex-none rounded-[14px] px-3.5 text-sm">
          <Download size={16} /> Instalar
        </button>
      )}
      <Sheet open={help} onClose={() => setHelp(false)} title="Instalar FitTracker">
        <div className="pb-3">
          <InstallInstructions state={state} />
        </div>
      </Sheet>
    </section>
  );
}

/** Aviso en Inicio, solo en celulares sin la app instalada. Se puede cerrar. */
export function InstallBanner() {
  const state = useInstall();
  const [dismissed, setDismissed] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!state || dismissed || state === "installed" || state === "desktop-manual") return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div className="pop-in card relative flex items-center gap-3 p-3.5 pr-10">
      <Logo size={40} />
      <span className="min-w-0 flex-1">
        <b className="block text-[14px]">Instala la app en tu celular</b>
        <small className="text-[12px] text-sub">Pantalla completa, más rápida y funciona sin señal.</small>
      </span>
      <button onClick={() => (state === "prompt" ? promptInstall() : setHelp(true))} className="btn grad h-9 flex-none rounded-xl px-3 text-[13px]">
        {state === "prompt" ? "Instalar" : "Cómo"}
      </button>
      <button onClick={dismiss} className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg text-sub" aria-label="Cerrar aviso">
        <X size={16} />
      </button>
      <Sheet open={help} onClose={() => setHelp(false)} title="Instalar FitTracker">
        <div className="pb-3">
          <InstallInstructions state={state} />
        </div>
      </Sheet>
    </div>
  );
}
