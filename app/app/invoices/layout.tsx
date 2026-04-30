'use client';
import { Header } from '../App-Header';
import { Plus, User2 } from 'lucide-react';
import { ListView } from '@/components/list-view';
import { trpc } from '@/lib/trpc/client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Invoice_Item_List from './new/invoiceItem';
import { Invoice_List_Item } from './invoice-list-item';

type InvoiceProps = {
  children?: React.ReactNode;
};

export default function InvoiceLayout(props: InvoiceProps) {
  const title = 'Invoices';
  const { data, isPending } = trpc.invoices.list.useQuery({});
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
              minSize={20} // Changed to percentage as ResizablePanel usually expects %
              defaultSize={30}
              className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}
            >
              {/* flex-col + overflow-hidden prevents the sidebar itself from growing */}
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex flex-col gap-2 px-4 pt-4 ">
                  <Link href={'/app/invoices/new'}>
                    <Button className="w-full" variant="secondary">
                      <Plus /> Create Invoice
                    </Button>
                  </Link>
                  <Tabs defaultValue="all" className="">
                    <TabsList className="w-full">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="paid">Paid</TabsTrigger>
                      <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                      <TabsTrigger value="partial">Partial</TabsTrigger>
                      <TabsTrigger value="overdue">Overdue</TabsTrigger>
                    </TabsList>
                  </Tabs>
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
                    emptyIcon={<User2 className="size-20 text-muted-foreground" />}
                    cardRenderer={(data) => (
                      <Link
                        href={`/app/${title.toLowerCase()}/${data.id}` as any}
                        draggable={false}
                        className="block w-full h-full"
                      >
                        <Invoice_List_Item
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
