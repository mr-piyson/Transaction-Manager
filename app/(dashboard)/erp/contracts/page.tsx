'use client';

import { useTranslations } from 'next-intl';
import { Handshake } from 'lucide-react';
import { useContractForm } from '@/components/dialogs';
import { Button } from '@/components/ui/button';

export default function ContractsPage() {
  const { openCreate } = useContractForm();
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Handshake className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t('contracts.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('contracts.selectDescription')}</p>
      </div>
      <Button onClick={() => openCreate()}>
        {t('contracts.createContract')}
      </Button>
    </div>
  );
}
