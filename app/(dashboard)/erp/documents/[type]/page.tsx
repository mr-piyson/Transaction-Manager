'use client';

import { useTranslations } from 'next-intl';
import { FileText, Receipt } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useInvoiceForm } from '@/components/dialogs';

const TRPC_TYPE: Record<string, 'INVOICE' | 'QUOTE'> = {
  invoices: 'INVOICE',
  quotations: 'QUOTE',
};

export default function DocumentsPage() {
  const t = useTranslations();
  const params = useParams<{ type: string }>();
  const type = params.type;
  const { openCreate } = useInvoiceForm();

  const Icon = type === 'invoices' ? Receipt : FileText;

  const title = type === 'invoices' ? t('invoices.title') : t('layout.quotations');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1">{t('invoices.selectDescription')}</p>
      </div>
      <Button onClick={() => openCreate({ defaults: { type: TRPC_TYPE[type] ?? 'INVOICE' } })}>
        {t('invoices.newInvoice')}
      </Button>
    </div>
  );
}
