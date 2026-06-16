'use client';

import { BarChart3 } from 'lucide-react';
import { Header } from '@/app/app/App-Header';

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header title="Reports" icon={<BarChart3 className="size-5" />} />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Reports module — coming soon.</p>
      </div>
    </div>
  );
}
