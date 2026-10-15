"use client";

import { ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeRefresh, goBack, recordVisit } from "@/lib/nav-history";

/** Registra cada pantalla visitada; va en el layout de la app. */
export function NavHistory() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    recordVisit(pathname + window.location.search);
    if (consumeRefresh(pathname)) router.refresh();
  }, [pathname, router]);
  return null;
}

export function BackButton({ fallback, label = "Volver", icon = "back", className = "" }: { fallback: string; label?: string; icon?: "back" | "close"; className?: string }) {
  const router = useRouter();
  const Icon = icon === "close" ? X : ArrowLeft;
  return (
    <button type="button" onClick={() => goBack(router, fallback)} className={`icon-btn ${className}`} aria-label={label}>
      <Icon size={20} />
    </button>
  );
}
