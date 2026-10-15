import { ImageResponse } from "next/og";

// Iconos de la app generados en el build (PNG): /icons/icon-192.png, etc.
const ICONS: Record<string, { size: number; variant: "rounded" | "full" | "maskable" }> = {
  "icon-192.png": { size: 192, variant: "rounded" },
  "icon-512.png": { size: 512, variant: "rounded" },
  "maskable-512.png": { size: 512, variant: "maskable" },
  "apple-touch-icon.png": { size: 180, variant: "full" },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

function Dumbbell({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform="rotate(-40 50 50)" fill="#ffffff">
        <rect x="28" y="45" width="44" height="10" rx="5" />
        <rect x="18" y="30" width="12" height="40" rx="6" />
        <rect x="70" y="30" width="12" height="40" rx="6" />
        <rect x="8" y="38" width="10" height="24" rx="5" />
        <rect x="82" y="38" width="10" height="24" rx="5" />
      </g>
    </svg>
  );
}

export async function GET(_: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, variant } = icon;
  const inset = variant === "rounded" ? size * 0.06 : 0;
  const glyph = variant === "maskable" ? size * 0.5 : size * 0.62;

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
        <div
          style={{
            width: size - inset * 2,
            height: size - inset * 2,
            borderRadius: variant === "rounded" ? size * 0.24 : 0,
            background: "linear-gradient(135deg, #7c5cff 0%, #2e8bff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Dumbbell size={glyph} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
