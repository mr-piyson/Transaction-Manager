'use client';

import { Header } from '@/app/app/App-Header';
import {
  ShoppingCart,
  Users,
  Store,
  FileText,
  LayoutDashboard,
  Box,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import React from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Quick Action Card Component
// ---------------------------------------------------------------------------
function QuickActionCard({
  label,
  icon,
  onClick,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const content = (
    <div
      className={cn(
        'group flex flex-col items-center justify-center gap-3 p-6 h-full w-full',
        'rounded-3xl border border-muted bg-background shadow-sm transition-all duration-300',
        'hover:shadow-xl  hover:shadow-primary/30 hover:-translate-y-1.5 cursor-pointer',
        className,
      )}
    >
      <div className="p-4 rounded-2xl bg-current/10 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="text-sm font-black uppercase tracking-widest text-foreground/80 ">
        {label}
      </span>
      <ArrowRight className="size-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-40 group-hover:translate-x-0" />
    </div>
  );

  if (children) {
    return (
      <div className="aspect-square">
        {React.cloneElement(children as React.ReactElement, {}, content)}
      </div>
    );
  }

  return (
    <button onClick={onClick} className="aspect-square text-left">
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function App_Page() {
  const router = useRouter();
  const { data: user } = trpc.auth.getSession.useQuery();

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <Header title="Dashboard" />

      <main className="flex-1 p-6 lg:p-10 space-y-12 max-w-400 mx-auto w-full"></main>
    </div>
  );
}
