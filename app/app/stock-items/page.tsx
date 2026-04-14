'use client';

import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { Box, Layers } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { CreateStockItemDialog } from './create-stockItem-dialog';
import { Badge } from '@/components/ui/badge';

export default function StockItemsPage() {
  const { data: items, isLoading, isError } = trpc.items.getItems.useQuery();

  return (
    <>
      <Header title="Item Master" transparent sticky>
        <CreateStockItemDialog />
      </Header>

      <ListView
        data={items || []}
        isLoading={isLoading}
        searchFields={['name', 'sku']}
        emptyIcon={<Box className="size-12 opacity-20" />}
        emptyTitle="Item Master Empty"
        emptyDescription="Define products and services here to use them across suppliers and warehouses."
        cardRenderer={(item) => (
          <div className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer border-b last:border-0 border-border/50">
            <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
              <Box className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{item.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-mono">
                  {item.sku}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 sm:mt-0">
                <span className="text-xs text-muted-foreground truncate max-w-50">
                  {item.description || 'No description'}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  <Layers className="size-3" />
                  {item._count?.supplierItems || 0} Suppliers
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground block mb-0.5 uppercase tracking-wider">
                Providers
              </span>
              <span className="font-bold text-sm bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                {item._count?.supplierItems || 0}
              </span>
            </div>
          </div>
        )}
      />
    </>
  );
}
