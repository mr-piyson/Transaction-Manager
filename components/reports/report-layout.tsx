'use client';

import type { ReactNode } from 'react';
import { Header } from '@/components/layout/App-Header';

interface ReportLayoutProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  rightContent?: ReactNode;
}

export function ReportLayout({
  title,
  icon,
  children,
  actions,
  rightContent,
}: ReportLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12 print:pb-0">
      <Header
        title={title}
        icon={icon}
        actions={actions}
        rightContent={rightContent}
        className="print:hidden"
      />
      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-360 mx-auto w-full print:p-4 print:space-y-4">
        {children}
      </main>
    </div>
  );
}
