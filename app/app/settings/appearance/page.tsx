'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { SectionCard } from '../_shared';

const THEMES = [
  {
    id: 'light' as const,
    label: 'Light',
    description: 'Always use light mode.',
    icon: Sun,
  },
  {
    id: 'dark' as const,
    label: 'Dark',
    description: 'Always use dark mode.',
    icon: Moon,
  },
  {
    id: 'system' as const,
    label: 'System',
    description: 'Follow your system preference.',
    icon: Monitor,
  },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const resolved = theme ?? 'system';

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title="Appearance"
        description="Choose your preferred color scheme."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEMES.map(({ id, label, description, icon: Icon }) => {
            const selected = resolved === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  'relative flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-all',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50',
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <Icon
                  className={cn(
                    'size-8',
                    selected ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      selected ? 'text-primary' : '',
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
