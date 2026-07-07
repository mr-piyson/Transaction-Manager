'use client';

import { useTranslations } from 'next-intl';
import { Warehouse } from 'lucide-react';
import { useWarehouseForm } from '@/components/dialogs';
import { Button } from '@/components/ui/button';

export default function WarehousesPage() {
  const { openCreate } = useWarehouseForm();
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Warehouse className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t('warehouses.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('warehouses.selectDescription')}</p>
      </div>
      <Button onClick={() => openCreate()}>
        {t('warehouses.createWarehouse')}
      </Button>
    </div>
  );
}
