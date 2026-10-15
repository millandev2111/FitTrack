import type { Metadata } from "next";
import { LiveSession } from "./live-session";

export const metadata: Metadata = { title: "Sesión en curso" };

// El id va en ?id= y se lee en el cliente: así una sola página guardada por el
// service worker sirve para cualquier sesión cuando no hay conexión.
export default function SessionPage() {
  return <LiveSession />;
}
