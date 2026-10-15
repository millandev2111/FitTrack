import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/registro", "/recuperar", "/auth", "/offline", "/api/reminders"];
const GUEST_ONLY = ["/login", "/registro", "/recuperar"];

export async function proxy(request: NextRequest) {
  // Sin Supabase configurado, la app muestra la pantalla de configuración.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // No pongas código entre createServerClient y getClaims: refresca la sesión.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  // Solo se redirige al navegar. Un envío de formulario (Server Action) redirigido
  // recibe una página en vez de su respuesta y falla con "unexpected response".
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && !PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return redirectTo("/login", path === "/" ? undefined : path + request.nextUrl.search);
  }
  if (signedIn && GUEST_ONLY.includes(path)) {
    return redirectTo("/");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|splash/|exercises/|sw.js|manifest.webmanifest|offline.html|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|woff2?)$).*)",
  ],
};
