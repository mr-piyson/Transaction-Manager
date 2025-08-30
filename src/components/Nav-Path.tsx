import { usePathname, useRouter } from "next/navigation";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RecordDrawer } from "@/components/Record/Records";
import { Button } from "./ui/button";

export const NavPath: React.FC = () => {
  const pathname = usePathname();
  const activity = pathname.split("/").slice(2, 3).join("/");
  const router = useRouter();
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        <React.Fragment>
          <Button variant="ghost" className=" h-full p-1 px-2">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => {
                  router.push(`/App/${activity}`);
                }}
                className="text-lg"
              >
                {activity}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Button>
        </React.Fragment>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export function NavRecordItem(props: any) {
  return (
    <RecordDrawer>
      <Button variant={"ghost"} className="p-1 px-2">
        <BreadcrumbItem>
          <Avatar>
            <AvatarImage src={props.src} alt="Record Image" />
            <AvatarFallback>RM</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate font-semibold ps-1 text-foreground">
            {props.title}
          </span>
        </BreadcrumbItem>
      </Button>
    </RecordDrawer>
  );
}
