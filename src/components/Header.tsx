"use client";

import { useHeader } from "@/hooks/use-header";
import { cn } from "@/lib/utils";

export function Header() {
  const { config } = useHeader();

  const { leftContent, centerContent, rightContent, className, showBorder = true, sticky = true, transparent = false } = config;

  return (
    <header
      className={cn(
        "w-full z-50 transition-all duration-300",
        sticky && "sticky top-0",
        transparent ? "bg-transparent" : "bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        showBorder && "border-b border-border",
        className,
      )}
    >
      <div className=" mx-auto px-2 sm:px-6 ">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left Section */}
          {leftContent && <div className="flex items-center gap-4 flex-1">{leftContent}</div>}

          {/* Center Section */}
          {centerContent && <div className="flex items-center justify-center shrink-0">{centerContent}</div>}

          {/* Right Section */}
          {rightContent && <div className="flex items-center gap-4 flex-1 justify-end">{rightContent}</div>}
        </div>
      </div>
    </header>
  );
}
