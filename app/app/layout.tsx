import { SplashScreen } from '@/components/Splash-Screen';
import { AppSidebar } from './App-Sidebar';
import { AlertProvider } from '@/components/Alert-dialog';
import { SidebarProvider } from '@/components/sidebar';
import { redirect } from 'next/navigation';
import { checkOrganization } from '@/server/organizations';
import { getCurrentUser } from '@/lib/auth';
import { AppFooter } from './App-Footer';

export default async function App(props: any) {
  if (!checkOrganization()) {
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
          <div className="relative flex flex-col flex-1 min-h-full">
            <div className="flex flex-col flex-1 overflow-auto relative">{props.children}</div>
            <AppFooter />
          </div>
        </SidebarProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
