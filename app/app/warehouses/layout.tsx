'use client';

import { Header } from '../App-Header';
import { PackageOpen, MapPinIcon, StoreIcon, WarehouseIcon } from 'lucide-react';
import { ListView } from '@/components/list-view';
import { trpc } from '@/lib/trpc/client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { Warehouse_List_Item } from './warehouse-list-item';

type WarehouseLayoutProps = {
  children?: React.ReactNode;
};

export default function WarehouseLayout(props: WarehouseLayoutProps) {
  const title = 'Warehouses';
  const { data, isPending } = trpc.warehouses.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${title.toLowerCase()}`;

  return (
    // Ensure the outer wrapper occupies the remaining viewport height
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={title} />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {/* Sidebar Panel */}
          {(isListView || !isMobile) && (
            <ResizablePanel
              minSize={20}
              defaultSize={30}
              className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}
            >
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex gap-2 px-4 pt-4 ">
                  <WarehouseFormDialog className="w-full" variant="secondary" />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={data}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['name', 'address']}
                    rowHeight={73}
                    emptyTitle={`No ${title.toLowerCase()} found`}
                    emptyDescription={`Create your first ${title.slice(0, -1).toLowerCase()} to see them here.`}
                    emptyIcon={<WarehouseIcon className="size-20 text-muted-foreground" />}
                    cardRenderer={(data) => (
                      <Link
                        href={`/app/${title.toLowerCase()}/${data.id}` as any}
                        draggable={false}
                        className="block w-full h-full"
                      >
                        <Warehouse_List_Item
                          data={data as any}
                          className={cn(
                            'hover:bg-muted/40 border border-transparent',
                            activeItem === data.id ? 'border-primary border bg-primary/10' : '',
                          )}
                        />
                      </Link>
                    )}
                  />
                </div>
              </aside>
            </ResizablePanel>
          )}

          <ResizableHandle className={cn('hidden md:flex', !isListView && 'hidden md:flex')} />

          {/* Main Content Panel */}
          {(!isListView || !isMobile) && (
            <ResizablePanel
              defaultSize={70}
              className={cn('h-full w-full', isListView ? 'hidden md:block' : 'block')}
            >
              {props.children}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
