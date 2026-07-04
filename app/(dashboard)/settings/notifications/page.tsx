'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

const NOTIFICATION_KEYS_MAP = [
  { key: 'notify_approval_request', labelKey: 'settings.notifApprovalRequest', descKey: 'settings.notifApprovalRequestDesc' },
  { key: 'notify_invoice_sent', labelKey: 'settings.notifInvoiceSent', descKey: 'settings.notifInvoiceSentDesc' },
  { key: 'notify_invoice_approved', labelKey: 'settings.notifInvoiceApproved', descKey: 'settings.notifInvoiceApprovedDesc' },
  { key: 'notify_invoice_rejected', labelKey: 'settings.notifInvoiceRejected', descKey: 'settings.notifInvoiceRejectedDesc' },
  { key: 'notify_invoice_cancelled', labelKey: 'settings.notifInvoiceCancelled', descKey: 'settings.notifInvoiceCancelledDesc' },
  { key: 'notify_invoice_converted', labelKey: 'settings.notifInvoiceConverted', descKey: 'settings.notifInvoiceConvertedDesc' },
  { key: 'notify_payment_received', labelKey: 'settings.notifPaymentReceived', descKey: 'settings.notifPaymentReceivedDesc' },
  { key: 'notify_payment_deleted', labelKey: 'settings.notifPaymentDeleted', descKey: 'settings.notifPaymentDeletedDesc' },
  { key: 'notify_po_approved', labelKey: 'settings.notifPOApproved', descKey: 'settings.notifPOApprovedDesc' },
  { key: 'notify_po_rejected', labelKey: 'settings.notifPORejected', descKey: 'settings.notifPORejectedDesc' },
  { key: 'notify_po_ordered', labelKey: 'settings.notifPOOrdered', descKey: 'settings.notifPOOrderedDesc' },
  { key: 'notify_po_received', labelKey: 'settings.notifPOReceived', descKey: 'settings.notifPOReceivedDesc' },
  { key: 'notify_po_cancelled', labelKey: 'settings.notifPOCancelled', descKey: 'settings.notifPOCancelledDesc' },
  { key: 'notify_low_stock', labelKey: 'settings.notifLowStock', descKey: 'settings.notifLowStockDesc' },
  { key: 'notify_overdue', labelKey: 'settings.notifOverdue', descKey: 'settings.notifOverdueDesc' },
] as const;

export default function NotificationsPage() {
  const t = useTranslations();
  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const getValue = useCallback(
    (key: string) => settings?.[key] === 'true',
    [settings],
  );

  const toggle = useCallback(
    (key: string, current: boolean) => {
      updateSetting.mutate({ key, value: String(!current) });
    },
    [updateSetting],
  );

  const notificationItems = useMemo(
    () => NOTIFICATION_KEYS_MAP.map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      description: t(item.descKey),
    })),
    [t],
  );

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
        {notificationItems.map(({ key, label, description }) => {
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
