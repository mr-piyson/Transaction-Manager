'use client';

import { Calendar, CheckCircle2, Clock, Loader2, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTimePunchForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useDateFormat } from '@/hooks/use-date-format';

export default function AttendanceRecordsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [lateFilter, setLateFilter] = useState('all');
  const { openCreate } = useTimePunchForm();
  const { formatDate } = useDateFormat();
  const limit = 25;

  const { data, isLoading, refetch } = trpc.hr.attendance.records.list.useQuery({
    page,
    limit,
    employeeId: employeeFilter || undefined,
    isLate: lateFilter === 'all' ? undefined : lateFilter === 'late',
    search: search || undefined,
  });

  const calculateMutation = trpc.hr.attendance.records.calculate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Attendance calculated from time punches');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.attendance.records.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Attendance record updated');
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
              placeholder="Search by employee..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={lateFilter} onValueChange={(v) => { setLateFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Late status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="on-time">On Time</SelectItem>
            </SelectContent>
          </Select>
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
              <EmptyMedia><Calendar className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No attendance records</EmptyTitle>
              <EmptyDescription>No attendance records found for the selected filters.</EmptyDescription>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.employee?.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{record.employee?.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.date ? formatDate(record.date) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.totalHours != null ? `${record.totalHours.toFixed(2)}h` : '—'}
                      </TableCell>
                      <TableCell>
                        {record.isLate ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800">Late</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">On Time</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                calculateMutation.mutate({
                                  employeeId: record.employeeId,
                                  date: record.date,
                                })
                              }
                            >
                              <CheckCircle2 className="size-4 mr-2" />
                              Recalculate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: record.id,
                                  isLate: !record.isLate,
                                })
                              }
                            >
                              {record.isLate ? (
                                <><CheckCircle2 className="size-4 mr-2" /> Mark On Time</>
                              ) : (
                                <><XCircle className="size-4 mr-2" /> Mark Late</>
                              )}
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
