import Link from "next/link";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "@/lib/settings";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DialogTitle } from "@/components/ui/dialog";

interface SettingsLayoutProps {
  params: Promise<{ settings: string }>;
  children: React.ReactNode;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
  const pathname = (await props.params).settings;

  const SettingsItemList = () => (
    <>
      {settingsNavItems.map((item) => {
        const isActive = pathname === item.title;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm rounded-md group",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <item.icon
              className={cn(
                "mr-3 h-5 w-5",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="container mx-auto p-8 h-full">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <h1 className="flex items-center justify-between mb-8">
            <span className="text-4xl font-bold tracking-tight">Settings</span>
            <Drawer direction="bottom">
              <DrawerTrigger asChild>
                <Button variant="ghost" className="md:hidden">
                  <Menu className="size-6" />
                </Button>
              </DrawerTrigger>

              <DrawerContent>
                <DrawerHeader>
                  <DialogTitle className="text-4xl font-bold tracking-tight">
                    Settings
                  </DialogTitle>
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
        <div className="flex-1">{props.children}</div>
      </div>
    </div>
  );
}
