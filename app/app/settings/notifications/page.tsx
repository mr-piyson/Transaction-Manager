'use client';

import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

const NOTIFICATION_KEYS = [
  { key: 'notify_invoice_created', label: 'Invoice Created', description: 'Notify when a new invoice is created.' },
  { key: 'notify_invoice_paid', label: 'Invoice Paid', description: 'Notify when an invoice is marked as paid.' },
  { key: 'notify_invoice_overdue', label: 'Invoice Overdue', description: 'Notify when an invoice becomes overdue.' },
  { key: 'notify_payment_received', label: 'Payment Received', description: 'Notify when a payment is received.' },
  { key: 'notify_low_stock', label: 'Low Stock Alert', description: 'Notify when stock levels are low.' },
] as const;

export default function NotificationsPage() {
  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
  });

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
        title="Notifications"
        description="Configure which events trigger notifications."
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
