'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function NotificationsPage() {
  const t = useTranslations();
  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const NOTIFICATION_KEYS = [
    { key: 'notify_approval_request', label: t('settings.notifApprovalRequest'), description: t('settings.notifApprovalRequestDesc') },
    { key: 'notify_invoice_sent', label: t('settings.notifInvoiceSent'), description: t('settings.notifInvoiceSentDesc') },
    { key: 'notify_invoice_approved', label: t('settings.notifInvoiceApproved'), description: t('settings.notifInvoiceApprovedDesc') },
    { key: 'notify_invoice_rejected', label: t('settings.notifInvoiceRejected'), description: t('settings.notifInvoiceRejectedDesc') },
    { key: 'notify_invoice_cancelled', label: t('settings.notifInvoiceCancelled'), description: t('settings.notifInvoiceCancelledDesc') },
    { key: 'notify_invoice_converted', label: t('settings.notifInvoiceConverted'), description: t('settings.notifInvoiceConvertedDesc') },
    { key: 'notify_payment_received', label: t('settings.notifPaymentReceived'), description: t('settings.notifPaymentReceivedDesc') },
    { key: 'notify_payment_deleted', label: t('settings.notifPaymentDeleted'), description: t('settings.notifPaymentDeletedDesc') },
    { key: 'notify_po_approved', label: t('settings.notifPOApproved'), description: t('settings.notifPOApprovedDesc') },
    { key: 'notify_po_rejected', label: t('settings.notifPORejected'), description: t('settings.notifPORejectedDesc') },
    { key: 'notify_po_ordered', label: t('settings.notifPOOrdered'), description: t('settings.notifPOOrderedDesc') },
    { key: 'notify_po_received', label: t('settings.notifPOReceived'), description: t('settings.notifPOReceivedDesc') },
    { key: 'notify_po_cancelled', label: t('settings.notifPOCancelled'), description: t('settings.notifPOCancelledDesc') },
    { key: 'notify_low_stock', label: t('settings.notifLowStock'), description: t('settings.notifLowStockDesc') },
    { key: 'notify_overdue', label: t('settings.notifOverdue'), description: t('settings.notifOverdueDesc') },
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
