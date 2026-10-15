import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import { IOS_SPLASH, splashMedia, splashName } from "@/lib/splash";
import { THEME_COLORS, themeScript } from "@/lib/theme";
import "./globals.css";

const sora = Sora({ variable: "--font-heading", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FitTracker", template: "%s · FitTracker" },
  description: "Registra tus entrenos, rompe tus marcas y mira cómo avanzas.",
  applicationName: "FitTracker",
  appleWebApp: {
    capable: true,
    title: "FitTracker",
    statusBarStyle: "black-translucent",
    startupImage: IOS_SPLASH.map((s) => ({ url: `/splash/${splashName(s)}`, media: splashMedia(s) })),
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLORS.dark,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="dark"
      data-accent="volt"
      className={`${sora.variable} ${dmSans.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
