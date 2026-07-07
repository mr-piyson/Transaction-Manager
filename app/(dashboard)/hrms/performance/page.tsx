'use client';

import { MoreHorizontal, Search, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { usePerformanceReviewForm } from '@/components/dialogs';
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  ACKNOWLEDGED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
};

export default function PerformanceListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [employeeId, setEmployeeId] = useState('');
  const limit = 25;
  const { openCreate } = usePerformanceReviewForm();

  const { data, isLoading, refetch } = trpc.hr.performance.list.useQuery({
    page,
    limit,
    search: search || undefined,
    status: status === 'all' ? undefined : (status as any),
    employeeId: employeeId || undefined,
  });

  const deleteMutation = trpc.hr.performance.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Performance review deleted');
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
              placeholder="Search by employee or reviewer..."
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
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Employee ID filter..."
            className="w-[180px]"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
          />
        </div>
        <Button onClick={() => openCreate()}>
          New Review
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
              <EmptyMedia><Star className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No performance reviews</EmptyTitle>
              <EmptyDescription>No performance reviews found for the selected filters.</EmptyDescription>
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Review Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review Date</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/hrms/performance/${record.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">{record.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{record.employee?.employeeCode}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.reviewer?.name ?? record.reviewer?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.reviewPeriod ?? '—'}
                      </TableCell>
                      <TableCell>
                        {record.rating != null ? (
                          <Badge variant="outline" className={
                            record.rating >= 4 ? 'bg-green-100 text-green-800' :
                            record.rating >= 3 ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {record.rating}/5
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[record.status] ?? ''}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.reviewDate ? format(new Date(record.reviewDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/hrms/performance/${record.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            {record.status === 'DRAFT' && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  alert.delete({
                                    title: 'Delete Review',
                                    description: 'Are you sure you want to delete this performance review?',
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
