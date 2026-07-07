'use client';

import { Edit, Eye, Trash2, User, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import type { ContextMenuItemSchema } from '@/components/context-menu';
import { useEmployeeForm } from '@/components/dialogs';
import { Header } from '@/components/layout/App-Header';
import { ListView } from '@/components/list-view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { EmployeeListItem } from './_components/employee-list-item';

export default function EmployeesLayout({ children }: { children?: React.ReactNode }) {
  const { openCreate, openEdit } = useEmployeeForm();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data, isPending } = trpc.hr.employees.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === '/hrms/employees';

  const deleteMutation = trpc.hr.employees.delete.useMutation({
    onSuccess: () => {
      utils.hr.employees.list.invalidate();
      toast.success('Employee deleted');
      if (activeItem) router.push('/hrms/employees');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.hr.employees.updateStatus.useMutation({
    onSuccess: () => {
      utils.hr.employees.list.invalidate();
      if (activeItem) utils.hr.employees.byId.invalidate({ id: activeItem });
      toast.success('Employee status updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const renderCard = useCallback(
    (item: any) => {
      const menuItems: ContextMenuItemSchema[] = [
        {
          id: 'view',
          label: 'View Details',
          icon: Eye,
          onClick: () => router.push(`/hrms/employees/${item.id}`),
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: Edit,
          onClick: () =>
            openEdit(
              { id: item.id },
              { onSuccess: () => utils.hr.employees.byId.invalidate({ id: item.id }) },
            ),
        },
        { id: 'sep1', type: 'separator' as const },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () =>
            alert.delete({
              title: 'Delete Employee',
              description: 'This will terminate and soft-delete this employee. This action cannot be undone.',
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
            href={`/hrms/employees/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <EmployeeListItem
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
    [activeItem, deleteMutation, openEdit, router, utils],
  );

  const employees = Array.isArray(data) ? data : (data as any)?.data ?? [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="Employees" icon={<Users className="size-5" />} />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {(isListView || !isMobile) && (
            <ResizablePanel minSize={20} defaultSize={30} className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}>
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={employees}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['employeeCode', 'user.name', 'user.email'] as any}
                    rowHeight={76}
                    emptyTitle="No employees found"
                    emptyDescription="Create your first employee to get started"
                    emptyIcon={<User className="size-20 text-muted-foreground" />}
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
