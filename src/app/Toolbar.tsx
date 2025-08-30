"use client";
import { NavPath } from "@/components/Nav-Path";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Account } from "@prisma/client";
import { UserMenu } from "./App";

export function Toolbar({ account }: { account: Account | null }) {
  return (
    <header className="flex sticky z-10 top-0 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 h-12 shrink-0 items-center gap-2 border-b px-4 flex-nowrap ">
      {/* Left hand side */}
      <div className="h-full w-full flex left flex-1 items-center gap-2 ">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2  h-4" />
        <NavPath />
      </div>
      {/* Right hand side */}
      <div className="flex items-center gap-2">
        <UserMenu account={account} />
      </div>
    </header>
  );
}
