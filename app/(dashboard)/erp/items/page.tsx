'use client';

import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ItemsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Package className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t('items.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('items.selectDescription')}</p>
      </div>
      <Button onClick={() => router.push('/erp/items/new')}>
        {t('items.createItem')}
      </Button>
    </div>
  );
}
