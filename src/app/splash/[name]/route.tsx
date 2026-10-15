import { ImageResponse } from "next/og";
import { IOS_SPLASH, splashName } from "@/lib/splash";

// Pantallas de carga del iPhone, generadas en el build: /splash/iphone-1179x2556.png, etc.
export const dynamicParams = false;

export function generateStaticParams() {
  return IOS_SPLASH.map((s) => ({ name: splashName(s) }));
}

export async function GET(_: Request, { params }: RouteContext<"/splash/[name]">) {
  const { name } = await params;
  const spec = IOS_SPLASH.find((s) => splashName(s) === name);
  if (!spec) return new Response("Not found", { status: 404 });
  const width = spec.w * spec.dpr;
  const height = spec.h * spec.dpr;
  const logo = Math.round(width * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: logo * 0.28,
          background: "radial-gradient(circle at 50% 30%, #2a2366 0%, #090b14 55%)",
        }}
      >
        <div
          style={{
            width: logo,
            height: logo,
            borderRadius: logo * 0.3,
            background: "linear-gradient(135deg, #7c5cff 0%, #2e8bff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={logo * 0.62} height={logo * 0.62} viewBox="0 0 100 100">
            <g transform="rotate(-40 50 50)" fill="#ffffff">
              <rect x="28" y="45" width="44" height="10" rx="5" />
              <rect x="18" y="30" width="12" height="40" rx="6" />
              <rect x="70" y="30" width="12" height="40" rx="6" />
              <rect x="8" y="38" width="10" height="24" rx="5" />
              <rect x="82" y="38" width="10" height="24" rx="5" />
            </g>
          </svg>
        </div>
        <div style={{ display: "flex", color: "#f3f4fb", fontSize: Math.round(width * 0.075), fontWeight: 700, letterSpacing: -1 }}>FitTracker</div>
      </div>
    ),
    { width, height },
  );
}
