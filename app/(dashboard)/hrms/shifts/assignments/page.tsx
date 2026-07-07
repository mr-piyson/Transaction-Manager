'use client';

import { Calendar, Loader2, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function ShiftAssignmentsPage() {
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 25;
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignStartTime, setAssignStartTime] = useState('');
  const [assignEndTime, setAssignEndTime] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const { data, isLoading, refetch } = trpc.hr.shifts.employeeShifts.list.useQuery({
    page,
    limit,
    employeeId: employeeId || undefined,
    dateRange: dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined,
  });

  const deleteMutation = trpc.hr.shifts.employeeShifts.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Assignment removed'); },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.hr.shifts.employeeShifts.upsert.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Shift assigned');
      setShowAssignDialog(false);
      resetAssignForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});
  const { data: shiftsData } = trpc.hr.shifts.list.useQuery({});

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData as any)?.data ?? [];
  const assignments = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function resetAssignForm() {
    setAssignEmployeeId('');
    setAssignShiftId('');
    setAssignDate('');
    setAssignStartTime('');
    setAssignEndTime('');
    setAssignNotes('');
  }

  function handleAssign() {
    if (!assignEmployeeId || !assignShiftId || !assignDate) {
      toast.error('Employee, Shift, and Date are required');
      return;
    }
    createMutation.mutate({
      employeeId: assignEmployeeId,
      shiftId: assignShiftId,
      date: assignDate,
      startTime: assignStartTime || undefined,
      endTime: assignEndTime || undefined,
      notes: assignNotes || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              className="pl-9"
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAssignDialog(true)}>
          <UserPlus className="size-4 mr-2" />
          Assign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><Calendar className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No shift assignments</EmptyTitle>
              <EmptyDescription>Assign a shift to an employee to get started.</EmptyDescription>
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
                    <TableHead>Shift</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{a.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{a.employee?.employeeCode}</p>
                      </TableCell>
                      <TableCell className="text-sm">{a.shift?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {a.date ? format(new Date(a.date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{a.startTime ?? '—'}</TableCell>
                      <TableCell className="text-sm font-mono">{a.endTime ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {a.notes ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Remove this assignment?')) deleteMutation.mutate({ id: a.id });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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

      <Dialog open={showAssignDialog} onOpenChange={(open) => { setShowAssignDialog(open); if (!open) resetAssignForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Assign Shift
            </DialogTitle>
            <DialogDescription>Assign a shift to an employee for a specific date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Employee *</Label>
              <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <Label>Shift *</Label>
              <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <Label>Date *</Label>
              <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <Label>Start Time</Label>
                <Input type="time" value={assignStartTime} onChange={(e) => setAssignStartTime(e.target.value)} />
              </Field>
              <Field orientation="vertical">
                <Label>End Time</Label>
                <Input type="time" value={assignEndTime} onChange={(e) => setAssignEndTime(e.target.value)} />
              </Field>
            </div>
            <Field orientation="vertical">
              <Label>Notes</Label>
              <Input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Optional notes" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
