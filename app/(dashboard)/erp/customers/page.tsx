'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { useCustomerForm } from '@/components/dialogs';
import { Button } from '@/components/ui/button';

export default function CustomersPage() {
  const { openCreate } = useCustomerForm();
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Users className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t('customers.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('customers.selectDescription')}</p>
      </div>
      <Button onClick={() => openCreate()}>
        {t('customers.createCustomer')}
      </Button>
    </div>
  );
}
