'use client';

import { useTranslations } from 'next-intl';
import { Download, Edit, Eye, FileText, Package, Trash2, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import type { ContextMenuItemSchema } from '@/components/context-menu';
import { useItemForm } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { ListView } from '@/components/list-view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/App-Header';
import { ItemListItem } from '@/components/items/item-list-item';

const title = 'Items';

export default function ItemsLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();

  const TYPE_FILTERS = [
    { value: '', label: t('common.all') },
    { value: 'PRODUCT', label: t('items.types.PRODUCT') },
    { value: 'SERVICE', label: t('items.types.SERVICE') },
  ];

  const { openCreate, openEdit } = useItemForm();
  const [typeFilter, setTypeFilter] = React.useState('');
  const { data, isPending } = trpc.items.list.useQuery({ type: (typeFilter || undefined) as 'PRODUCT' | 'SERVICE' | undefined });
  const utils = trpc.useUtils();
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/erp/${title.toLowerCase()}`;

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t('items.itemDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const renderCard = useCallback(
    (item: any) => {
      const menuItems: ContextMenuItemSchema[] = [
        {
          id: 'view',
          label: t('common.viewDetails'),
          icon: Eye,
          onClick: () => router.push(`/erp/items/${item.id}`),
        },
        {
          id: 'edit',
          label: t('common.edit'),
          icon: Edit,
          onClick: () =>
            openEdit(
              {
                id: item.id,
                type: item.type,
                sku: item.sku,
                barcode: item.barcode ?? undefined,
                name: item.name,
                image: item.image ?? undefined,
                unit: item.unit,
                isSaleable: item.isSaleable,
                isPurchasable: item.isPurchasable,
                purchasePrice: Number(item.purchasePrice),
                salesPrice: Number(item.salesPrice),
                minStock: item.minStock,
                reorderPoint: item.reorderPoint,
                reorderQty: item.reorderQty,
                categoryId: item.category?.id ?? undefined,
                familyId: (item as any).family?.id ?? undefined,
                classId: (item as any).class?.id ?? undefined,
                commodityId: (item as any).commodity?.id ?? undefined,
                taxRateId: item.taxRate?.id ?? undefined,
              },
              { onSuccess: () => utils.items.byId.invalidate({ id: item.id }) },
            ),
        },
        { id: 'sep1', type: 'separator' },
        {
          id: 'delete',
          label: t('common.delete'),
          icon: Trash2,
          destructive: true,
          onClick: () =>
            alert.delete({
              title: t('common.confirmDelete'),
              description: t('common.thisActionCannotBeUndone'),
              confirmText: t('common.delete'),
              onConfirm: async () => {
                await deleteMutation.mutateAsync({ id: item.id });
              },
            }),
        },
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/${title.toLowerCase()}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <ItemListItem
              data={item}
              className={cn(
                'hover:bg-muted/40 border border-transparent',
                activeItem === item.id ? 'border-primary border bg-primary/10' : '',
              )}
            />
          </Link>
        </UniversalContextMenu>
      );
    },
    [activeItem, openEdit, deleteMutation, utils, router],
  );

  const items = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={t('layout.items')} icon={<Package className="size-5" />} onCreate={() => openCreate()} createLabel={t('items.createItem')} actions={<Link href="/erp/items/import"><Button variant="outline" size="sm"><Download className="size-3.5 mr-1" />Import</Button></Link>} />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {(isListView || !isMobile) && (
            <ResizablePanel minSize={20} defaultSize={30} className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}>
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="border-b px-4 py-2">
                  <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                    <TabsList className="h-auto w-full justify-start">
                      {TYPE_FILTERS.map((filter) => (
                        <TabsTrigger key={filter.value} value={filter.value} className="text-xs px-3 py-1">
                          {filter.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={items}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['name', 'sku', 'description'] as any}
                    rowHeight={73}
                    emptyTitle={t('items.noItems')}
                    emptyDescription={t('items.createItem')}
                    emptyIcon={<User2 className="size-20 text-muted-foreground" />}
                    cardRenderer={renderCard}
                  />
                </div>
              </aside>
            </ResizablePanel>
          )}

          <ResizableHandle className={cn('hidden md:flex', !isListView && 'hidden md:flex')} />

          {(!isListView || !isMobile) && (
            <ResizablePanel defaultSize={70} className={cn('h-full w-full', isListView ? 'hidden md:block' : 'flex flex-col')}>
              {children}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
