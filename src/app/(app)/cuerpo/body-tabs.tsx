"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { willReplace } from "@/lib/nav-history";

export function BodyTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/cuerpo", label: "Peso y medidas" },
    { href: "/cuerpo/fotos", label: "Fotos" },
  ];
  return (
    <nav className="seg" aria-label="Secciones de cuerpo">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          replace
          onClick={() => t.href !== pathname && willReplace()}
          aria-current={pathname === t.href ? "page" : undefined}
          className={`flex-1 rounded-[0.6rem] py-2 text-center text-[13px] font-semibold transition-colors ${
            pathname === t.href ? "bg-surface text-fg shadow-(--shadow)" : "text-sub"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
