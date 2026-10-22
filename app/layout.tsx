import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { DirectionProvider } from "@/components/ui/direction";
import { DateFormatProvider } from "@/hooks/use-date-format";
import TrpcProvider from "@/lib/trpc/provider";
import { cn } from "@/lib/utils";
import { I18nProvider } from "./i18n-provider";
import { Toaster } from "./sonner";
import { ThemeProvider } from "./theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Absolute origin of the deployment, used for canonical/OG URLs. Falls back
 * to a local address so a missing (or malformed) env var can never take the
 * whole app down.
 */
function getMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    "http://localhost:3005",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return new URL("http://localhost:3005");
}

export const metadata: Metadata = {
  title: "Transaction Manager",
  description: "Best CRM system for your business to manage transactions",
  applicationName: "Transaction Manager",
  metadataBase: getMetadataBase(),
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "256x256" }],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS standalone mode (installed from the home screen).
  appleWebApp: {
    capable: true,
    title: "Transaction Manager",
    statusBarStyle: "black-translucent",
  },
  // The ERP is full of numbers — stop iOS turning them into phone links.
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Lets the layout extend under the notch / home indicator on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2c2742" },
    { media: "(prefers-color-scheme: dark)", color: "#00558d" },
  ],
};

/**
 * iOS launch images. Safari picks the first entry whose media query matches
 * the device. React hoists these <link> tags into <head> for us.
 */
const APPLE_STARTUP_IMAGES = [
  {
    src: "/icons/apple-splash-640x1136.jpg",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    src: "/icons/apple-splash-750x1334.jpg",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    src: "/icons/apple-splash-828x1792.jpg",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    src: "/icons/apple-splash-1125x2436.jpg",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    src: "/icons/apple-splash-1242x2688.jpg",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    src: "/icons/apple-splash-1284x2778.jpg",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    src: "/icons/apple-splash-1536x2048.jpg",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
  },
];

export default async function RootLayout(props: any) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>
          <I18nProvider>
            <ThemeProvider
              attribute={"class"}
              defaultTheme={"system"}
              enableSystem={true}
              storageKey={"theme"}
            >
              <DirectionProvider direction={dir}>
                <TrpcProvider>
                  <DateFormatProvider>{props.children}</DateFormatProvider>
                </TrpcProvider>
              </DirectionProvider>
            </ThemeProvider>
          </I18nProvider>
          <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} />
        </NuqsAdapter>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        {APPLE_STARTUP_IMAGES.map((image) => (
          <link
            key={image.src}
            rel="apple-touch-startup-image"
            href={image.src}
            media={image.media}
          />
        ))}
      </body>
    </html>
  );
}
