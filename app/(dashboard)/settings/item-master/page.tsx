'use client';

import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ItemImportWizard } from '@/components/items/bulk-import/wizard';

export default function ItemMasterPage() {
  const t = useTranslations();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Package className="size-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings.itemMaster.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('settings.itemMaster.description')}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ItemImportWizard />
      </div>
    </div>
  );
}
