'use client';

import { Edit, Eye, Trash2, User2, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import type { ContextMenuItemSchema } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useCustomerForm } from '@/components/dialogs';
import { Header } from '../App-Header';
import { Customer_List_Item } from '@/components/customers/customer-list-item';

const title = 'Customers';

export default function CustomersLayout({ children }: { children?: React.ReactNode }) {
  const { openCreate, openEdit } = useCustomerForm();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data, isPending } = trpc.customers.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${title.toLowerCase()}`;

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success('Customer deleted');
      if (activeItem) router.push('/app/customers');
    },
    onError: (e) => toast.error(e.message),
  });

  const renderCard = useCallback(
    (item: any) => {
      const menuItems: ContextMenuItemSchema[] = [
        {
          id: 'view',
          label: 'View details',
          icon: Eye,
          onClick: () => router.push(`/app/customers/${item.id}`),
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: Edit,
          onClick: () =>
            openEdit(
              { id: item.id, name: item.name, phone: item.phone ?? undefined, email: item.email ?? undefined },
              { onSuccess: () => utils.customers.byId.invalidate({ id: item.id }) },
            ),
        },
        { id: 'sep1', type: 'separator' as const },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
          disabled: deleteMutation.isPending,
          onClick: () =>
            alert.delete({
              title: `Delete "${item.name}"?`,
              description: 'This customer will be deactivated.',
              confirmText: 'Delete',
              onConfirm: async () => {
                await deleteMutation.mutateAsync({ id: item.id });
              },
            }),
        },
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/app/${title.toLowerCase()}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <Customer_List_Item
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
      <Header title={title} icon={<Users className="size-5" />} onCreate={() => openCreate()} createLabel="New Customer" />
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
                    searchFields={['name', 'phone', 'email']}
                    rowHeight={73}
                    emptyTitle="No customers found"
                    emptyDescription="Create your first customer to see them here."
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
