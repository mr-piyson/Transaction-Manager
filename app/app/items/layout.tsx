'use client';

import { Package, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { ListView } from '@/components/list-view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useItemForm } from '@/components/dialogs';
import { Header } from '../App-Header';
import { ItemListItem } from '@/components/items/item-list-item';

const title = 'Items';

export default function ItemsLayout({ children }: { children?: React.ReactNode }) {
  const { openCreate } = useItemForm();
  const { data, isPending } = trpc.items.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${title.toLowerCase()}`;

  const renderCard = useCallback(
    (item: any) => (
      <Link
        href={`/app/${title.toLowerCase()}/${item.id}`}
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
    ),
    [activeItem],
  );

  const items = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={title} icon={<Package className="size-5" />} onCreate={() => openCreate()} createLabel="New Item" />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {(isListView || !isMobile) && (
            <ResizablePanel minSize={20} defaultSize={30} className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}>
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={items}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['name', 'sku', 'description'] as any}
                    rowHeight={73}
                    emptyTitle="No items found"
                    emptyDescription="Create your first item to see them here."
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
