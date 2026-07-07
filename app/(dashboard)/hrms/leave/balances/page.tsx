'use client';

import { Calculator, Loader2, Plus, Search } from 'lucide-react';
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
import { useLeaveAllocateForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';

export default function LeaveBalancesPage() {
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const limit = 25;
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustTargetId, setAdjustTargetId] = useState('');
  const [adjustmentDays, setAdjustmentDays] = useState('');

  const { data, isLoading, refetch } = trpc.hr.leave.balances.list.useQuery({
    page,
    limit,
    employeeId: employeeId || undefined,
    year: year ? parseInt(year) : undefined,
    leaveTypeId: leaveTypeId || undefined,
  });

  const adjustMutation = trpc.hr.leave.balances.adjust.useMutation({
    onSuccess: () => { refetch(); setAdjustDialogOpen(false); toast.success('Balance adjusted'); },
    onError: (e) => toast.error(e.message),
  });

  const { openCreate } = useLeaveAllocateForm();
  const { data: employeesData } = trpc.hr.employees.list.useQuery({});
  const { data: leaveTypesData } = trpc.hr.leave.types.list.useQuery({});

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : (leaveTypesData as any)?.data ?? [];
  const balances = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={leaveTypeId} onValueChange={(v) => { setLeaveTypeId(v); setPage(1); }}>
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
          <Input
            type="number"
            className="w-[120px]"
            placeholder="Year"
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="size-4 mr-2" />
          Allocate
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : balances.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><Calculator className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No leave balances</EmptyTitle>
              <EmptyDescription>Allocate leave to employees to get started.</EmptyDescription>
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
                    <TableHead>Year</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Carried Forward</TableHead>
                    <TableHead>Adjustments</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b: any) => {
                    const remaining = (b.allocatedDays ?? 0) - (b.usedDays ?? 0) + (b.carriedForwardDays ?? 0) + (b.adjustments ?? 0);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{b.employee?.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{b.employee?.employeeCode}</p>
                        </TableCell>
                        <TableCell className="text-sm">{b.leaveType?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{b.year ?? '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{b.allocatedDays ?? 0}</TableCell>
                        <TableCell className="text-sm font-mono">{b.usedDays ?? 0}</TableCell>
                        <TableCell className="text-sm font-mono">
                          <Badge variant={remaining < 0 ? 'destructive' : remaining === 0 ? 'secondary' : 'default'}>
                            {remaining}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{b.carriedForwardDays ?? 0}</TableCell>
                        <TableCell className="text-sm font-mono">{b.adjustments ?? 0}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustTargetId(b.id);
                              setAdjustmentDays('');
                              setAdjustDialogOpen(true);
                            }}
                          >
                            Adjust
                          </Button>
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

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Leave Balance</DialogTitle>
            <DialogDescription>Add or subtract days from this balance. Use negative values to deduct.</DialogDescription>
          </DialogHeader>
          <Field orientation="vertical">
            <Label>Adjustment Days</Label>
            <Input
              type="number"
              value={adjustmentDays}
              onChange={(e) => setAdjustmentDays(e.target.value)}
              placeholder="e.g. 2 or -1"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!adjustmentDays) { toast.error('Enter adjustment days'); return; }
                adjustMutation.mutate({ id: adjustTargetId, adjustmentDays: parseInt(adjustmentDays) });
              }}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
