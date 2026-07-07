'use client';

import { Edit, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Header } from '@/components/layout/App-Header';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { useEmployeeTypeForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';

export default function EmployeeTypesPage() {
  const [search, setSearch] = useState('');
  const { openCreate, openEdit } = useEmployeeTypeForm();

  const { data, isLoading, refetch } = trpc.hr.employeeTypes.list.useQuery();

  const deleteMutation = trpc.hr.employeeTypes.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Employee type deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const records = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleDelete = (et: any) => {
    alert.delete({
      title: 'Delete Employee Type',
      description: `Are you sure you want to delete "${et.name}"?`,
      confirmText: 'Delete',
      onConfirm: () => { deleteMutation.mutate({ id: et.id }) },
    });
  };

  return (
    <div className="space-y-6">
      <Header
        title="Employee Types"
        description="Manage employee type classifications"
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="size-4 mr-2" />
            Add Type
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><UserCheck className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No employee types</EmptyTitle>
              <EmptyDescription>No employee types found for the selected filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{record.code || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {record.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.isActive ? 'default' : 'secondary'}>
                        {record.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary">{record._count?.employees ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(record)}>
                            <Edit className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(record)}>
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
