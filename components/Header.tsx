"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import {
  ArrowBigLeft,
  ArrowBigRight,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header({
  title = "",
  leftContent,
  rightContent,
  showBorder = true,
  sticky = true,
  transparent = false,
  className,
  icon,
}: {
  title?: ReactNode | string;
  icon?: ReactNode | undefined;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "w-full z-50 transition-all duration-300 print:hidden",
        sticky && "sticky top-0",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        showBorder && "border-b border-border",
        className,
      )}
    >
      <div className=" mx-auto px-2 sm:px-6 ">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left Section */}
          {title && (
            <div className="flex flex-1 flex-row items-center w-full gap-2 text-foreground/85">
              <div className="inline bg-primary  w-1 h-8 rounded-sm" />
              {icon}
              <span className=" text-2xl font-semibold capitalize">
                {title}
              </span>
            </div>
          )}

          {/* Right Section */}
          {rightContent}
        </div>
      </div>
    </header>
  );
}
