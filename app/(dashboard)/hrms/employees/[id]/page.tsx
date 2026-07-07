'use client';

import {
  Briefcase,
  Calendar,
  Edit,
  History,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
  UserCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { useEmployeeForm } from '@/components/dialogs';
import { EmployeeStatusBadge } from '@/components/hrms/employee-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'ON_LEAVE', label: 'On Leave', color: 'bg-amber-100 text-amber-800' },
  { value: 'SUSPENDED', label: 'Suspended', color: 'bg-purple-100 text-purple-800' },
  { value: 'RESIGNED', label: 'Resigned', color: 'bg-gray-100 text-gray-800' },
  { value: 'TERMINATED', label: 'Terminated', color: 'bg-red-100 text-red-800' },
];

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useEmployeeForm();
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [statusReason, setStatusReason] = React.useState('');

  const { data: employee, isLoading, isError, refetch } = trpc.hr.employees.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const { data: statusHistory } = trpc.hr.employees.statusHistory.list.useQuery(
    { employeeId: params.id },
    { enabled: !!params.id },
  );

  const deleteMutation = trpc.hr.employees.delete.useMutation({
    onSuccess: () => {
      utils.hr.employees.list.invalidate();
      toast.success('Employee deleted');
      router.push('/hrms/employees');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.hr.employees.updateStatus.useMutation({
    onSuccess: () => {
      utils.hr.employees.byId.invalidate({ id: params.id });
      utils.hr.employees.list.invalidate();
      utils.hr.employees.statusHistory.list.invalidate({ employeeId: params.id });
      toast.success('Employee status updated');
      setStatusDialogOpen(false);
      setSelectedStatus('');
      setStatusReason('');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    deleteMutation.isPending || updateStatusMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia><UserCircle className="size-16" /></EmptyMedia>
            <EmptyTitle>Employee not found</EmptyTitle>
            <EmptyDescription>The employee you're looking for doesn't exist or has been deleted.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {employee.user?.image ? (
                <img src={employee.user.image} alt={employee.user.name} className="size-full object-cover" />
              ) : (
                <User className="size-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{employee.user?.name}</h1>
                <EmployeeStatusBadge status={employee.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">{employee.employeeCode}</span>
                {employee.jobPosition?.name && <span> · {employee.jobPosition.name}</span>}
                {employee.department?.name && <span> · {employee.department.name}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Change Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_OPTIONS.filter((s) => s.value !== employee.status).map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => {
                      setSelectedStatus(opt.value);
                      setStatusDialogOpen(true);
                    }}
                  >
                    <Badge variant="outline" className={opt.color}>{opt.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit({ id: employee.id }, { onSuccess: () => refetch() })}
            >
              <Edit className="size-4 mr-1" /> Edit
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                alert.delete({
                  title: 'Delete Employee',
                  description: 'This will terminate and soft-delete this employee. This action cannot be undone.',
                  confirmText: 'Delete',
                  onConfirm: async () => {
                    await deleteMutation.mutateAsync({ id: params.id });
                  },
                })
              }
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{employee._count?.leaveRequests ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{employee._count?.attendanceRecords ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Payroll Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{employee._count?.payrollItems ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Direct Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{employee._count?.directReports ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" /> Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Employee Code</dt>
                    <dd className="font-mono font-medium mt-0.5">{employee.employeeCode}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium mt-0.5 flex items-center gap-1">
                      <Mail className="size-3 text-muted-foreground" />
                      {employee.user?.email ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium mt-0.5 flex items-center gap-1">
                      <Phone className="size-3 text-muted-foreground" />
                      {employee.phone ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hire Date</dt>
                    <dd className="font-medium mt-0.5">
                      {employee.hireDate ? format(new Date(employee.hireDate), 'dd MMM yyyy') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Probation End Date</dt>
                    <dd className="font-medium mt-0.5">
                      {employee.probationEndDate ? format(new Date(employee.probationEndDate), 'dd MMM yyyy') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Termination Date</dt>
                    <dd className="font-medium mt-0.5">
                      {employee.terminationDate ? format(new Date(employee.terminationDate), 'dd MMM yyyy') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Emergency Contact</dt>
                    <dd className="font-medium mt-0.5">{employee.emergencyContact ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Emergency Phone</dt>
                    <dd className="font-medium mt-0.5">{employee.emergencyPhone ?? '—'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="size-4" /> Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Department</dt>
                    <dd className="font-medium mt-0.5">{employee.department?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Job Position</dt>
                    <dd className="font-medium mt-0.5">{employee.jobPosition?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Employee Type</dt>
                    <dd className="font-medium mt-0.5">{employee.employeeType?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reports To</dt>
                    <dd className="font-medium mt-0.5">{employee.reportsTo?.user?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Salary Amount</dt>
                    <dd className="font-medium mt-0.5">
                      {employee.salaryAmount != null
                        ? `${Number(employee.salaryAmount).toFixed(3)} ${employee.salaryCurrency ?? ''}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Bank</dt>
                    <dd className="font-medium mt-0.5">
                      {employee.bankName ? `${employee.bankName}${employee.bankAccount ? ` (${employee.bankAccount})` : ''}` : '—'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Direct Reports */}
            {employee.directReports && employee.directReports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCircle className="size-4" /> Direct Reports ({employee.directReports.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {employee.directReports.map((report: any) => (
                      <div key={report.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{report.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{report.employeeCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leave Balances */}
            {employee.leaveBalances && employee.leaveBalances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="size-4" /> Leave Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Entitled</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.leaveBalances.map((lb: any) => (
                        <TableRow key={lb.id}>
                          <TableCell className="font-medium">{lb.leaveType?.name}</TableCell>
                          <TableCell>{lb.entitledDays}</TableCell>
                          <TableCell>{lb.usedDays}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              (lb.entitledDays - lb.usedDays) > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }>
                              {lb.entitledDays - lb.usedDays}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="size-4" /> Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusHistory && statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {statusHistory.slice(0, 5).map((entry: any) => (
                      <div key={entry.id} className="relative pl-6 pb-4 border-l last:pb-0">
                        <div className="absolute left-[-4.5px] top-1 size-2 rounded-full bg-muted-foreground" />
                        <div className="flex items-center gap-2 mb-1">
                          <EmployeeStatusBadge status={entry.newStatus} />
                          {entry.previousStatus && (
                            <span className="text-xs text-muted-foreground">
                              from <Badge variant="outline" className="text-xs">{entry.previousStatus}</Badge>
                            </span>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-xs text-muted-foreground">{entry.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : ''}
                          {entry.changedBy?.name && ` by ${entry.changedBy.name}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No status changes recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Managed Departments */}
            {employee.managedDepartments && employee.managedDepartments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Managed Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {employee.managedDepartments.map((dept: any) => (
                      <Badge key={dept.id} variant="secondary">{dept.name}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employee Status</DialogTitle>
            <DialogDescription>
              Change status from <Badge variant="outline">{employee.status}</Badge> to{' '}
              <Badge variant="outline" className={STATUS_OPTIONS.find(s => s.value === selectedStatus)?.color}>
                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="Enter reason for status change..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                updateStatusMutation.mutate({
                  id: params.id,
                  newStatus: selectedStatus as any,
                  reason: statusReason || undefined,
                })
              }
              disabled={updateStatusMutation.isPending || !selectedStatus}
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
