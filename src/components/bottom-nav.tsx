"use client";

import { ChartLine, History, House, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inicio", Icon: House },
  { href: "/historial", label: "Historial", Icon: History },
  null,
  { href: "/progreso", label: "Progreso", Icon: ChartLine },
  { href: "/perfil", label: "Perfil", Icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // Pantallas con su propia barra inferior (sesión en vivo, editor de rutina).
  if (pathname.startsWith("/sesion") || /^\/(rutinas|deportes)\/.+/.test(pathname)) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-b from-transparent to-bg to-60%" />
      <nav
        aria-label="Navegación principal"
        className="glass fixed inset-x-3.5 z-40 mx-auto flex h-[66px] max-w-[420px] items-center justify-around rounded-[26px]"
        style={{ bottom: "max(env(safe-area-inset-bottom), 14px)" }}
      >
        {ITEMS.map((item) =>
          item ? (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex w-14 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive(item.href) ? "text-fg" : "text-sub"
              }`}
            >
              <item.Icon size={22} strokeWidth={isActive(item.href) ? 2.4 : 1.9} className={isActive(item.href) ? "text-a1" : ""} />
              {item.label}
            </Link>
          ) : (
            <Link
              key="entrenar"
              href="/entrenar"
              prefetch
              aria-label="Entrenar"
              className="grad -mt-8 grid size-14 place-items-center rounded-[20px] transition-transform active:scale-95"
              style={{ boxShadow: "0 12px 26px -8px color-mix(in srgb, var(--a1) 75%, transparent), 0 0 0 5px var(--bg)" }}
            >
              <Plus size={28} strokeWidth={2.4} />
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
