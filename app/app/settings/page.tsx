'use client';

import { Settings } from 'lucide-react';
import { Header } from '@/app/app/App-Header';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header title="Settings" icon={<Settings className="size-5" />} />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Settings module — coming soon.</p>
      </div>
    </div>
  );
}
