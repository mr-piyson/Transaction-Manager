'use client';

import { MoreHorizontal, Search, Sun, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { useHolidayForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { useDateFormat } from '@/hooks/use-date-format';

export default function HolidaysPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 25;
  const { formatDate } = useDateFormat();

  const { data, isLoading, refetch } = trpc.hr.leave.holidays.list.useQuery({
    page,
    limit,
    dateRange: dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined,
  });

  const deleteMutation = trpc.hr.leave.holidays.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Holiday deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const { openCreate } = useHolidayForm();

  const holidays = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <DatePicker
              className="w-[150px]"
              value={dateFrom}
              onChange={(v) => { setDateFrom(v); setPage(1); }}
            />
            <Label className="text-xs text-muted-foreground">To</Label>
            <DatePicker
              className="w-[150px]"
              value={dateTo}
              onChange={(v) => { setDateTo(v); setPage(1); }}
            />
          </div>
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          Create Holiday
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><Sun className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No holidays found</EmptyTitle>
              <EmptyDescription>No holidays match your filters.</EmptyDescription>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Recurring Annual</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium text-sm">{h.name}</TableCell>
                      <TableCell className="text-sm">
                        {h.date ? formatDate(h.date) : '—'}
                      </TableCell>
                      <TableCell>
                        {h.isRecurringAnnual ? (
                          <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {h.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this holiday?')) deleteMutation.mutate({ id: h.id });
                              }}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
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
