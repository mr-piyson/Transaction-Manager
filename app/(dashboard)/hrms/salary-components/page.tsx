'use client';

import { DollarSign, Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { useSalaryComponentForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';

export default function SalaryComponentsPage() {
  const [employeeFilter, setEmployeeFilter] = useState('');
  const { openCreate, openEdit } = useSalaryComponentForm();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});

  const { data, isLoading, refetch } = trpc.hr.salaryComponents.list.useQuery({
    employeeId: employeeFilter || undefined,
  });

  const deleteMutation = trpc.hr.salaryComponents.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Salary component deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const records = Array.isArray(data) ? data : [];
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  const handleDelete = (sc: any) => {
    alert.delete({
      title: 'Delete Salary Component',
      description: `Are you sure you want to delete "${sc.name}"?`,
      confirmText: 'Delete',
      onConfirm: () => { deleteMutation.mutate({ id: sc.id }) },
    });
  };

  return (
    <div className="space-y-6">
      <Header
        title="Salary Components"
        description="Manage salary components for employees"
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="size-4 mr-2" />
            Add Component
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <Select
          value={employeeFilter}
          onValueChange={(v) => setEmployeeFilter(v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((emp: any) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.user?.name ?? emp.employeeCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><DollarSign className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No salary components</EmptyTitle>
              <EmptyDescription>No salary components found for the selected filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">{record.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{record.employee?.employeeCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>
                      <Badge variant={record.type === 'ALLOWANCE' ? 'default' : 'destructive'}>
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {record.amount != null ? record.amount.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.isRecurring ? 'secondary' : 'outline'}>
                        {record.isRecurring ? 'Recurring' : 'One-time'}
                      </Badge>
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
