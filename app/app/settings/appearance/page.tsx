'use client';

import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { SectionCard } from '../_shared';

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard
        title="Appearance"
        description="Customize the look and feel of the application."
      >
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">
              Toggle between light and dark theme.
            </p>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
          />
        </div>
      </SectionCard>
    </div>
  );
}
