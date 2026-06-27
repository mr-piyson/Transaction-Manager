'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function NotificationsPage() {
  const t = useTranslations();
  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
  });

  const NOTIFICATION_KEYS = [
    { key: 'notify_invoice_created', label: t('invoices.createInvoice'), description: t('invoices.issueDate') },
    { key: 'notify_invoice_paid', label: t('invoices.paid'), description: t('common.paid') },
    { key: 'notify_invoice_overdue', label: t('invoices.overdue'), description: t('common.overdue') },
    { key: 'notify_payment_received', label: t('invoices.paymentReceived'), description: t('invoices.payments') },
    { key: 'notify_low_stock', label: t('items.lowStock'), description: t('items.minStock') },
  ];

  const getValue = (key: string) => settings?.[key] === 'true';

  const toggle = (key: string, current: boolean) => {
    updateSetting.mutate({ key, value: String(!current) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.notifications')}
        description={t('settings.emailNotifications')}
      >
        {NOTIFICATION_KEYS.map(({ key, label, description }) => {
          const enabled = getValue(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => toggle(key, enabled)}
              />
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}
