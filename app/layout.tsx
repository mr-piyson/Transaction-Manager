import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/Theme-Provider";
import { I18nProvider } from "@/hooks/use-i18n";
import { Toaster } from "@/components/sonner";
import { getServerI18n } from "@/hooks/use-server-i18n";

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
  const { locale, direction, dict } = await getServerI18n("en");
  return (
    <html lang="en" dir={direction} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute={"class"}
          defaultTheme={"system"}
          enableSystem={true}
          storageKey={"theme"}
        >
          <I18nProvider initialLocale={locale} initialDict={dict}>
            {props.children}
          </I18nProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
