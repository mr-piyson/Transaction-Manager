import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/auth/auth-server';
import { AlertProvider } from '@/components/Alert-dialog';
import { DialogsProvider } from '@/components/dialogs';
import { SplashScreen } from '@/components/Splash-Screen';
import { SidebarProvider } from '@/components/sidebar';
import db from '@/lib/db';
import { AppFooter } from './App-Footer';
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
        <SidebarProvider className="flex ">
          <AppSidebar />
          <DialogsProvider>
            <div className="relative flex flex-col flex-1 min-h-full">
              <main className="flex flex-col flex-1 relative">{props.children}</main>
              {/* <AppFooter /> */}
            </div>
          </DialogsProvider>
        </SidebarProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
