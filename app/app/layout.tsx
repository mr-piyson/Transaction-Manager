import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/auth/auth-server';
import { AlertProvider } from '@/components/Alert-dialog';
import { DialogsProvider } from '@/components/dialogs';
import { SplashScreen } from '@/components/Splash-Screen';
import { SidebarProvider } from '@/components/sidebar';
import { CurrencyProvider } from '@/hooks/use-currency';
import db from '@/lib/db';
import { AppSidebar } from './App-Sidebar';

export default async function App(props: any) {
  if (!(await db.organization.count())) {
    redirect('/setup');
  }
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth`);
  }

  return (
    <SplashScreen>
      <AlertProvider>
        <CurrencyProvider>
          <SidebarProvider className="flex ">
            <AppSidebar />
            <DialogsProvider>
              <div className="relative flex flex-col flex-1 min-h-full">
                <main className="flex flex-col flex-1 relative">{props.children}</main>
              </div>
            </DialogsProvider>
          </SidebarProvider>
        </CurrencyProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
