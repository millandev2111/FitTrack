// Script que corre durante el parseo del HTML (antes del primer pintado).
// En el cliente se marca como text/plain para que React no avise por renderizar <script>.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
