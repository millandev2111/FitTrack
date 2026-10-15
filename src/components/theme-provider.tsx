"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ACCENT_KEY, THEME_COLORS, THEME_KEY, type Accent, type ThemePref } from "@/lib/theme";

type ThemeContextValue = {
  pref: ThemePref;
  accent: Accent;
  setPref: (pref: ThemePref) => void;
  setAccent: (accent: Accent) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function apply(pref: ThemePref, accent: Accent) {
  const root = document.documentElement;
  const dark =
    pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.accent = accent;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [accent, setAccentState] = useState<Accent>("volt");

  useEffect(() => {
    // Sincroniza el estado de React con lo que ya aplicó el script inline.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefState(read(THEME_KEY, "system"));
    setAccentState(read(ACCENT_KEY, "volt"));
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system", accent);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref, accent]);

  const setPref = useCallback(
    (next: ThemePref) => {
      setPrefState(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      apply(next, accent);
    },
    [accent],
  );

  const setAccent = useCallback(
    (next: Accent) => {
      setAccentState(next);
      try {
        localStorage.setItem(ACCENT_KEY, next);
      } catch {}
      apply(pref, next);
    },
    [pref],
  );

  return <ThemeContext value={{ pref, accent, setPref, setAccent }}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
