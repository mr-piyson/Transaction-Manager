import { SidebarProvider } from '@/components/sidebar';
import { DialogsProvider } from '@/components/dialogs';
import { AppSidebar } from '@/components/layout/App-Sidebar';

export default function HrmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="flex ">
      <AppSidebar />
      <DialogsProvider>
        <div className="relative flex flex-col flex-1 min-h-full">
          <main className="flex flex-col flex-1 relative">{children}</main>
        </div>
      </DialogsProvider>
    </SidebarProvider>
  );
}
