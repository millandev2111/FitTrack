"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-label="Cerrar" onClick={onClose} />
      <div
        className={`pop-in relative flex w-full max-w-md flex-col rounded-t-[28px] bg-bg ${tall ? "h-[88dvh]" : "max-h-[88dvh]"}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-sub/40" />
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <button className="icon-btn size-9" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function SheetAction({
  onClick,
  icon,
  children,
  tone = "default",
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-[15px] font-semibold transition-colors active:bg-surface-2 ${
        tone === "danger" ? "text-down" : ""
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
