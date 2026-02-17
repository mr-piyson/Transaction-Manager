import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./../globals.css";
import { ThemeProvider } from "@/components/Theme-Provider";
import { I18nProvider } from "@/hooks/use-i18n";
import { getLocale } from "../../i18n/i18n-server";
import { Toaster } from "@/components/sonner";
import db from "@/lib/database";
import { logger } from "hono/logger";
import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
  const { locale, direction } = await getLocale();
  const tenant = await db.tenant.count();
  const headerList = headers();
  const pathname = (await headerList).get("x-current-path");
  console.log(pathname);
  if (tenant == 0) {
    if (pathname !== "/setup") redirect("/setup");
  }
  return (
    <html lang="en" dir={direction} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute={"class"} defaultTheme={"system"} enableSystem={true} storageKey={"theme"}>
          <I18nProvider initialLocale={locale}>{props.children}</I18nProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
