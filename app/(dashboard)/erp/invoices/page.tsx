'use client';

import { useTranslations } from 'next-intl';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvoiceForm } from '@/components/dialogs';

export default function InvoicesPage() {
  const t = useTranslations();
  const { openCreate } = useInvoiceForm();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Receipt className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t('invoices.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('invoices.selectDescription')}</p>
      </div>
      <Button onClick={() => openCreate()}>
        {t('invoices.createInvoice')}
      </Button>
    </div>
  );
}
