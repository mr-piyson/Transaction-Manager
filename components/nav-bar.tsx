"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, FileText, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/app", icon: Home },
  { name: "Inventory", href: "/app/inventory", icon: Package },
  { name: "Invoices", href: "/app/invoices", icon: FileText },
  { name: "Customers", href: "/app/customers", icon: Users },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  // Keyboard Detection Logic
  useEffect(() => {
    const handleResize = () => {
      // If the window height shrinks significantly, the keyboard is likely open
      if (
        window.visualViewport &&
        window.visualViewport.height < window.innerHeight * 0.9
      ) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () =>
      window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // If keyboard is open, return null to remove it from DOM and let content use full height
  if (!isVisible) return null;

  return (
    /* Change: Removed 'fixed', added 'h-16' and 'shrink-0' to keep it at the bottom of the flex column */
    <nav className="shrink-0 h-16 bg-background border-t border-border md:hidden pb-safe w-full">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn("w-5 h-5 mb-1", isActive && "fill-primary/10")}
              />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
