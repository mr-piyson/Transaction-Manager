"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";
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
}: {
  title?: string;
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
          {leftContent || (
            <div className="flex items-center gap-4 flex-1">
              <div className="flex flex-row gap-4">
                <div className="bg-primary w-1 h-8 rounded-sm" />
                <h1 className="text-2xl font-semibold pb-1 capitalize">
                  {title}
                </h1>
              </div>
            </div>
          )}

          {/* Right Section */}
          {rightContent && (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Button onClick={router.back} variant={"ghost"}>
                <ArrowBigLeft />
              </Button>
              <Button onClick={router.forward} variant={"ghost"}>
                <ArrowBigRight />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
