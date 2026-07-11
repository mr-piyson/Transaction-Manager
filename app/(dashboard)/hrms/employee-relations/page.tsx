'use client';

import { Eye, Loader2, MessageSquare, MoreHorizontal, Search, Trash2, UserCheck } from 'lucide-react';
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
import { useDateFormat } from '@/hooks/use-date-format';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INVESTIGATING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-800',
};

export default function GrievancesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const limit = 25;
  const [viewGrievance, setViewGrievance] = useState<any>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const { formatDate, formatDateTime } = useDateFormat();

  const { data, isLoading, refetch } = trpc.hr.employeeRelations.grievances.list.useQuery({
    page,
    limit,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter as 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'ESCALATED',
    employeeId: employeeFilter || undefined,
  });

  const deleteMutation = trpc.hr.employeeRelations.grievances.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Grievance deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const updateAssigneeMutation = trpc.hr.employeeRelations.grievances.assign.useMutation({
    onSuccess: () => { refetch(); setAssignDialog(false); toast.success('Assignee updated'); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.hr.employeeRelations.grievances.updateStatus.useMutation({
    onSuccess: () => { refetch(); setStatusDialog(false); toast.success('Status updated'); },
    onError: (e) => toast.error(e.message),
  });

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const grievances = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : grievances.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><MessageSquare className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No grievances found</EmptyTitle>
              <EmptyDescription>No grievances match your filters.</EmptyDescription>
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
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grievances.map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{g.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.employee?.employeeCode}</p>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{g.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge[g.status] ?? ''}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{g.assignee?.user?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {g.createdAt ? formatDate(g.createdAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewGrievance(g)}>
                              <Eye className="size-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAssignTargetId(g.id);
                                setAssignEmployeeId(g.assigneeId ?? '');
                                setAssignDialog(true);
                              }}
                            >
                              <UserCheck className="size-4 mr-2" /> Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setStatusTargetId(g.id);
                                setNewStatus(g.status);
                                setResolution(g.resolution ?? '');
                                setStatusDialog(true);
                              }}
                            >
                              <MessageSquare className="size-4 mr-2" /> Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this grievance?')) deleteMutation.mutate({ id: g.id });
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

      <Dialog open={!!viewGrievance} onOpenChange={() => setViewGrievance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grievance Details</DialogTitle>
          </DialogHeader>
          {viewGrievance && (
            <div className="space-y-3 text-sm">
              <div><strong>Employee:</strong> {viewGrievance.employee?.user?.name}</div>
              <div><strong>Subject:</strong> {viewGrievance.subject}</div>
              <div><strong>Description:</strong> {viewGrievance.description ?? '—'}</div>
              <div><strong>Status:</strong> {viewGrievance.status}</div>
              <div><strong>Assignee:</strong> {viewGrievance.assignee?.user?.name ?? 'Unassigned'}</div>
              <div><strong>Resolution:</strong> {viewGrievance.resolution ?? '—'}</div>
              <div><strong>Created:</strong> {viewGrievance.createdAt ? formatDateTime(viewGrievance.createdAt) : '—'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewGrievance(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Grievance</DialogTitle>
            <DialogDescription>Assign this grievance to an employee for investigation.</DialogDescription>
          </DialogHeader>
          <Field orientation="vertical">
            <Label>Assignee</Label>
            <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={() => updateAssigneeMutation.mutate({ id: assignTargetId, assignedToId: assignEmployeeId })}
              disabled={updateAssigneeMutation.isPending}
            >
              {updateAssigneeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the grievance status and add resolution details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <Label>Resolution</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Resolution details..."
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button
              onClick={() => updateStatusMutation.mutate({ id: statusTargetId, status: newStatus as 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'ESCALATED', resolution: resolution || undefined })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
