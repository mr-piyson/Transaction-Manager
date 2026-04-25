'use client';
import { Header } from '../App-Header';
import { Plus, ShoppingCartIcon } from 'lucide-react';
import { ListView } from '@/components/list-view';
import { trpc } from '@/lib/trpc/client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { PO_List_Item } from './po-item-list';
import { Button } from '@/components/ui/button';

type CustomerLayoutProps = {
  children?: React.ReactNode;
};

export default function CustomerLayout(props: CustomerLayoutProps) {
  const title = 'Purchase Order';
  const url = 'purchase-order';
  const Icon = ShoppingCartIcon;
  const { data, isPending } = trpc.purchaseOrders.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${url.toLowerCase()}`;

  return (
    // Ensure the outer wrapper occupies the remaining viewport height
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={title} icon={<Icon />} />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {/* Sidebar Panel */}
          {(isListView || !isMobile) && (
            <ResizablePanel
              minSize={20} // Changed to percentage as ResizablePanel usually expects %
              defaultSize={30}
              className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}
            >
              {/* flex-col + overflow-hidden prevents the sidebar itself from growing */}
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex gap-2 px-4 pt-4 ">
                  <Button className="w-full" variant="secondary">
                    <Plus />
                    New PO
                  </Button>
                </div>
                {/* ListView needs to be able to scroll internally */}
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={data}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={[]}
                    rowHeight={73}
                    emptyTitle={`No ${title.toLowerCase()} found`}
                    emptyDescription={`Create your first ${title.slice(0, -1).toLowerCase()} to see them here.`}
                    emptyIcon={<Icon className="size-20 text-muted-foreground" />}
                    cardRenderer={(data) => (
                      <Link
                        href={`/app/${title.toLowerCase()}/${data.id}` as any}
                        draggable={false}
                        className="block w-full h-full"
                      >
                        <PO_List_Item
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
              {/* FIX: h-full + overflow-y-auto 
                  This makes the right side scrollable and prevents it from pushing 
                  the height of the entire page down.
              */}
              {props.children}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
