'use client';

import { CalendarCheck, CheckCircle2, Loader2, Plus, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { differenceInCalendarDays, format } from 'date-fns';

const statusBadge: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function LeaveRequestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 25;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newLeaveTypeId, setNewLeaveTypeId] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading, refetch } = trpc.hr.leave.requests.list.useQuery({
    page,
    limit,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    employeeId: employeeFilter || undefined,
    leaveTypeId: leaveTypeFilter || undefined,
    dateRange: dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined,
  });

  const createMutation = trpc.hr.leave.requests.create.useMutation({
    onSuccess: () => { refetch(); setCreateDialogOpen(false); resetCreateForm(); toast.success('Leave request created'); },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.hr.leave.requests.approve.useMutation({
    onSuccess: () => { refetch(); toast.success('Leave request approved'); },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.hr.leave.requests.reject.useMutation({
    onSuccess: () => { refetch(); setRejectDialogOpen(false); toast.success('Leave request rejected'); },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.hr.leave.requests.cancel.useMutation({
    onSuccess: () => { refetch(); setCancelDialogOpen(false); toast.success('Leave request cancelled'); },
    onError: (e) => toast.error(e.message),
  });

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});
  const { data: leaveTypesData } = trpc.hr.leave.types.list.useQuery({});
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : (leaveTypesData as any)?.data ?? [];
  const requests = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function resetCreateForm() {
    setNewEmployeeId('');
    setNewLeaveTypeId('');
    setNewStartDate('');
    setNewEndDate('');
    setNewReason('');
    setNewNotes('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leaveTypeFilter} onValueChange={(v) => { setLeaveTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Leave Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {leaveTypes.map((lt: any) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><CalendarCheck className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No leave requests</EmptyTitle>
              <EmptyDescription>No leave requests match your filters.</EmptyDescription>
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
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r: any) => {
                    const days = r.days ?? (r.startDate && r.endDate ? differenceInCalendarDays(new Date(r.endDate), new Date(r.startDate)) + 1 : '—');
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{r.employee?.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.employee?.employeeCode}</p>
                        </TableCell>
                        <TableCell className="text-sm">{r.leaveType?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.startDate ? format(new Date(r.startDate), 'dd MMM') : '—'}
                          {' — '}
                          {r.endDate ? format(new Date(r.endDate), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{days}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge[r.status] ?? ''}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {r.status === 'PENDING' && (
                                <>
                                  <DropdownMenuItem onClick={() => approveMutation.mutate({ id: r.id })}>
                                    <CheckCircle2 className="size-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setRejectTargetId(r.id);
                                      setRejectReason('');
                                      setRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="size-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setCancelTargetId(r.id);
                                    setCancelReason('');
                                    setCancelDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="size-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Create a leave request for an employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Employee *</Label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <Label>Leave Type *</Label>
              <Select value={newLeaveTypeId} onValueChange={setNewLeaveTypeId}>
                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <Label>Start Date *</Label>
                <Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
              </Field>
              <Field orientation="vertical">
                <Label>End Date *</Label>
                <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
              </Field>
            </div>
            <Field orientation="vertical">
              <Label>Reason</Label>
              <Input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Reason for leave" />
            </Field>
            <Field orientation="vertical">
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Additional notes..." />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newEmployeeId || !newLeaveTypeId || !newStartDate || !newEndDate) { toast.error('All required fields must be filled'); return; }
                createMutation.mutate({
                  employeeId: newEmployeeId,
                  leaveTypeId: newLeaveTypeId,
                  startDate: newStartDate,
                  endDate: newEndDate,
                  reason: newReason || undefined,
                  notes: newNotes || undefined,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Field orientation="vertical">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ id: rejectTargetId, reason: rejectReason || undefined })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for cancellation.</DialogDescription>
          </DialogHeader>
          <Field orientation="vertical">
            <Label>Reason</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason..." />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => cancelMutation.mutate({ id: cancelTargetId, reason: cancelReason || undefined })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
