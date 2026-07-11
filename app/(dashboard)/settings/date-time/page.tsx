'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { SectionCard } from '../_shared';
import {
  DATE_INPUT_FORMATS,
  DATE_DISPLAY_FORMATS,
  DATE_INPUT_FORMAT_LABELS,
  DATE_DISPLAY_FORMAT_LABELS,
  type DateInputFormat,
  type DateDisplayFormat,
  DEFAULT_INPUT_FORMAT,
  DEFAULT_DISPLAY_FORMAT,
} from '@/lib/date';

export default function DateTimePage() {
  const t = useTranslations();
  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const [selectedInputFormat, setSelectedInputFormat] = useState<DateInputFormat>(DEFAULT_INPUT_FORMAT);
  const [selectedDisplayFormat, setSelectedDisplayFormat] = useState<DateDisplayFormat>(DEFAULT_DISPLAY_FORMAT);
  const [initialized, setInitialized] = useState(false);

  useMemo(() => {
    if (settings && !initialized) {
      const inputVal = settings['date.inputFormat'];
      const displayVal = settings['date.displayFormat'];
      if (inputVal && inputVal in DATE_INPUT_FORMATS) {
        setSelectedInputFormat(inputVal as DateInputFormat);
      }
      if (displayVal && displayVal in DATE_DISPLAY_FORMATS) {
        setSelectedDisplayFormat(displayVal as DateDisplayFormat);
      }
      setInitialized(true);
    }
  }, [settings, initialized]);

  const today = new Date();
  const todayFormatted = format(today, 'yyyy-MM-dd');

  const handleInputFormatChange = useCallback(
    (fmt: DateInputFormat) => {
      setSelectedInputFormat(fmt);
      updateSetting.mutate({ key: 'date.inputFormat', value: fmt });
      toast.success(t('settings.dateTime.saved'));
    },
    [updateSetting, t],
  );

  const handleDisplayFormatChange = useCallback(
    (fmt: DateDisplayFormat) => {
      setSelectedDisplayFormat(fmt);
      updateSetting.mutate({ key: 'date.displayFormat', value: fmt });
      toast.success(t('settings.dateTime.saved'));
    },
    [updateSetting, t],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.dateTime.inputFormat')}
        description={t('settings.dateTime.inputFormatDesc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(DATE_INPUT_FORMAT_LABELS) as DateInputFormat[]).map((fmt) => {
            const selected = selectedInputFormat === fmt;
            const label = DATE_INPUT_FORMAT_LABELS[fmt];
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleInputFormatChange(fmt)}
                className={cn(
                  'relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all',
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
                <span className={cn('font-mono text-sm font-medium', selected ? 'text-primary' : '')}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(today, DATE_INPUT_FORMATS[fmt])}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.dateTime.displayFormat')}
        description={t('settings.dateTime.displayFormatDesc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(DATE_DISPLAY_FORMAT_LABELS) as DateDisplayFormat[]).map((fmt) => {
            const selected = selectedDisplayFormat === fmt;
            const example = DATE_DISPLAY_FORMAT_LABELS[fmt];
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleDisplayFormatChange(fmt)}
                className={cn(
                  'relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all',
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
                <span className={cn('text-sm font-medium', selected ? 'text-primary' : '')}>
                  {example}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {fmt}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.dateTime.preview')}
        description={t('settings.dateTime.todayIs')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.dateTime.inputFormat')}
            </p>
            <p className="font-mono text-lg">
              {format(today, DATE_INPUT_FORMATS[selectedInputFormat])}
            </p>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.dateTime.displayFormat')}
            </p>
            <p className="text-lg font-medium">
              {format(today, DATE_DISPLAY_FORMATS[selectedDisplayFormat])}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
