'use client';

import { Menu, Sidebar } from 'lucide-react';
import { useSidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { NavUser } from './UserOptions';

export function AppFooter() {
  const { toggleSidebar } = useSidebar();

  return (
    <footer
      className="
        sticky bottom-0 z-50 w-full 
        border-t bg-background 
        /* Safe area padding prevents mobile browser bars from covering content */
        pb-[env(safe-area-inset-bottom)] 
        /* Optional: Add md:hidden if you only want this footer on mobile */
      "
    >
      <div className="flex flex-row-reverse items-center justify-between px-4 py-2">
        {/* Sidebar Toggle Button */}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Sidebar className="size-5" />
        </Button>

        {/* User Component */}
        {/* Wrap in a div if NavUser needs constrained width */}
        <div className="shrink-0">
          <NavUser />
        </div>
      </div>
    </footer>
  );
}
