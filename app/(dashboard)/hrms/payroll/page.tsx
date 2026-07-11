'use client';

import { Loader2, MoreHorizontal, Plus, Search, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { usePayrollRunForm } from '@/components/dialogs';
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
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useDateFormat } from '@/hooks/use-date-format';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  PROCESSING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
};

export default function PayrollListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 25;
  const { openCreate } = usePayrollRunForm();

  const { data, isLoading, refetch } = trpc.hr.payroll.list.useQuery({
    page,
    limit,
    search: search || undefined,
    status: status === 'all' ? undefined : (status as any),
    dateRange: dateFrom || dateTo
      ? { from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined }
      : undefined,
  });

  const deleteMutation = trpc.hr.payroll.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Payroll run deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const records = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search payroll runs..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker
            className="w-[150px]"
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1); }}
            placeholder="From"
          />
          <DatePicker
            className="w-[150px]"
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1); }}
            placeholder="To"
          />
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="size-4 mr-1" /> New Payroll Run
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><Wallet className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No payroll runs</EmptyTitle>
              <EmptyDescription>No payroll runs found for the selected filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Total Salary</TableHead>
                    <TableHead>Total Deductions</TableHead>
                    <TableHead>Total Net</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/hrms/payroll/${record.id}`)}
                    >
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell className="text-sm">
                        {record.periodStart && record.periodEnd
                          ? `${format(new Date(record.periodStart), 'dd MMM')} - ${format(new Date(record.periodEnd), 'dd MMM yyyy')}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[record.status] ?? ''}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record._count?.items ?? record.items?.length ?? 0}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.totalSalary != null ? Number(record.totalSalary).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.totalDeductions != null ? Number(record.totalDeductions).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.totalNet != null ? Number(record.totalNet).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.createdAt ? format(new Date(record.createdAt), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/hrms/payroll/${record.id}`)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {record.status === 'DRAFT' && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  alert.delete({
                                    title: 'Delete Payroll Run',
                                    description: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
                                    confirmText: 'Delete',
                                    onConfirm: async () => {
                                      await deleteMutation.mutateAsync({ id: record.id });
                                    },
                                  })
                                }
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
