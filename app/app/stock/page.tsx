'use client';

import { useTranslations } from 'next-intl';
import { Boxes, SearchX } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { ListView } from '@/components/list-view';
import { trpc } from '@/lib/trpc/client';

type StockRow = {
  id: string;
  quantity: number;
  isLowStock: boolean;
  item: { id: string; name: string; sku: string | null; unit: string | null; reorderPoint: number; image: string | null };
  warehouse: { id: string; name: string };
};

export default function StockPage() {
  const t = useTranslations();
  const { data = [], isLoading } = trpc.stock.list.useQuery({});

  const stock = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('stock.title')} icon={<Boxes className="size-5" />} />
      <ListView
        cardRenderer={(s: StockRow) => (
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{s.item.name}</p>
              <p className="text-sm text-muted-foreground truncate">{s.item.sku ?? '—'} — {s.warehouse.name}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{Number(s.quantity).toFixed(3)} {s.item.unit ?? ''}</p>
              {s.isLowStock && (
                <p className="text-xs text-destructive">{t('stock.lowStock')}</p>
              )}
            </div>
          </div>
        )}
        searchFields={['id' as any]}
        data={stock}
        isLoading={isLoading}
        searchPlaceholder={t('stock.searchStock')}
        emptyTitle={t('stock.noStock')}
        emptyDescription={t('stock.adjustStock')}
      />
    </div>
  );
}
