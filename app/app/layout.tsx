import { SplashScreen } from '@/components/Splash-Screen';
import { AppSidebar } from './AppSidebar';
import { AlertProvider } from '@/components/Alert-dialog';
import { SidebarProvider } from '@/components/sidebar';
import { redirect } from 'next/navigation';
import { checkOrganization } from '@/server/setup';
import { getCurrentUser } from '@/lib/auth';

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
        <SidebarProvider className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="relative flex flex-col flex-1 min-h-full">
            {/* Toolbar fixed at top */}
            {/* Scrollable main area */}
            <div className="flex flex-col flex-1 overflow-auto relative">{props.children}</div>
            {/* Bottom Navigation */}
          </div>
        </SidebarProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
