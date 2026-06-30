import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/auth/auth-server';
import { AlertProvider } from '@/components/Alert-dialog';
import { SplashScreen } from '@/components/Splash-Screen';
import { SidebarProvider } from '@/components/sidebar';
import { CurrencyProvider } from '@/hooks/use-currency';
import db from '@/lib/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await db.organization.count())) {
    redirect('/setup');
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  return (
    <SplashScreen>
      <AlertProvider>
        <CurrencyProvider>
          <SidebarProvider className="flex flex-col">
            {children}
          </SidebarProvider>
        </CurrencyProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
