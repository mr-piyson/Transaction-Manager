import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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

export const metadata: Metadata = {
  title: "Transaction Manager",
  description: "Best CRM system for your business to manage transactions",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

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
      </body>
    </html>
  );
}
