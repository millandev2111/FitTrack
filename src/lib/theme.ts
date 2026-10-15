export type ThemePref = "system" | "light" | "dark";
export type Accent = "volt" | "fire" | "aqua";

export const THEME_KEY = "ft-theme";
export const ACCENT_KEY = "ft-accent";

export const ACCENTS: { id: Accent; label: string; from: string; to: string }[] = [
  { id: "volt", label: "Eléctrico", from: "#7c5cff", to: "#2e8bff" },
  { id: "fire", label: "Fuego", from: "#ff5a36", to: "#ff2d87" },
  { id: "aqua", label: "Aqua", from: "#00a6ec", to: "#00c48c" },
];

export const THEME_COLORS = { light: "#f1f3fa", dark: "#090b14" } as const;

// Se ejecuta antes del primer pintado para evitar el parpadeo de tema.
export const themeScript = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('${THEME_KEY}')||'system';
var a=localStorage.getItem('${ACCENT_KEY}')||'volt';
var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;
d.dataset.theme=r;d.dataset.accent=a;
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute('content',r==='dark'?'${THEME_COLORS.dark}':'${THEME_COLORS.light}');
}catch(e){}})()`;
