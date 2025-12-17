import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";
import { DialogTitle } from "@/components/ui/dialog";
import { routes } from "@/lib/routes";

interface SettingsLayoutProps {
  params: Promise<{ settings: string }>;
  children: React.ReactNode;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
  const pathname = (await props.params).settings;

  const SettingsItemList = () => (
    <>
      {Object.values(routes.settings.children).map(item => {
        const isActive = pathname === item.title.toLocaleLowerCase();
        return (
          <Link key={item.path} href={item.path} className={cn("flex items-center px-3 py-2 text-sm rounded-md group", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <svg className={cn(item.icon, "me-3 h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            <span className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}>{item.title}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className=" mx-auto  h-full">
      <div className="flex flex-col md:flex-row h-full">
        {/* Sidebar */}
        <div className="md:w-64 shrink-0 lg:border-r p-6">
          <h1 className="flex items-center justify-between mb-8">
            <span className="text-4xl font-semibold tracking-tight">Settings</span>
            <Drawer direction="bottom">
              <DrawerTrigger asChild>
                <Button variant="ghost" className="md:hidden">
                  <Menu className="size-6" />
                </Button>
              </DrawerTrigger>

              <DrawerContent>
                <DrawerHeader>
                  <DialogTitle className="text-4xl font-bold tracking-tight">Settings</DialogTitle>
                </DrawerHeader>
                <nav className="flex flex-col p-4 gap-3 my-5">
                  <SettingsItemList />
                </nav>
                <DrawerFooter className="my-5"></DrawerFooter>
              </DrawerContent>
            </Drawer>
          </h1>
          <nav className="space-y-1 max-md:hidden">
            <SettingsItemList />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">{props.children}</div>
      </div>
    </div>
  );
}
