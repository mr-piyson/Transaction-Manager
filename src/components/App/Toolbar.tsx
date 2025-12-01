"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/sidebar";
import { UserMenu } from "./App";
import { cn } from "@/lib/utils";

interface ToolbarProps extends React.ComponentProps<"header"> {}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className={cn("flex sticky z-10 top-0 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 h-12 shrink-0 items-center gap-2 border-b px-4 flex-nowrap ", props.className)}>
      {/* Left hand side */}
      <div className="h-full w-full flex left flex-1 items-center gap-2 ">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2  h-4" />
      </div>
      {/* Right hand side */}
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
