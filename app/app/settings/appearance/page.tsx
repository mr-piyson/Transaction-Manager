'use client';

import { useTranslations } from 'next-intl';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { SectionCard } from '../_shared';

export default function AppearancePage() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const resolved = theme ?? 'system';

  const THEMES = [
    {
      id: 'light' as const,
      label: t('settings.light'),
      description: t('settings.light'),
      icon: Sun,
    },
    {
      id: 'dark' as const,
      label: t('settings.dark'),
      description: t('settings.dark'),
      icon: Moon,
    },
    {
      id: 'system' as const,
      label: t('settings.system'),
      description: t('settings.system'),
      icon: Monitor,
    },
  ];

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.appearance')}
        description={t('settings.theme')}
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
