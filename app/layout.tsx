import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { DirectionProvider } from '@/components/ui/direction';
import { I18nProvider } from '@/components/i18n-provider';
import { Toaster } from '@/components/sonner';
import { ThemeProvider } from '@/components/Theme-Provider';
import { DateFormatProvider } from '@/hooks/use-date-format';
import TrpcProvider from '@/lib/trpc/provider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { cookies } from 'next/headers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Transaction Manager',
  description: 'Best CRM system for your business to manage transactions',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default async function RootLayout(props: any) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NuqsAdapter>
          <I18nProvider>
            <ThemeProvider
              attribute={'class'}
              defaultTheme={'system'}
              enableSystem={true}
              storageKey={'theme'}
            >
              <DirectionProvider direction={dir} dir={dir}>
                <TrpcProvider>
                  <DateFormatProvider>
                    {props.children}
                  </DateFormatProvider>
                </TrpcProvider>
              </DirectionProvider>
            </ThemeProvider>
          </I18nProvider>
          <Toaster position="top-center" />
        </NuqsAdapter>
      </body>
    </html>
  );
}
