'use client';

import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Plus,
  User,
  UserPlus,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
};

const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TrainingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [enrollDialogOpen, setEnrollDialogOpen] = React.useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState('');

  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = React.useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<any>(null);
  const [updateStatusValue, setUpdateStatusValue] = React.useState('');
  const [updateScore, setUpdateScore] = React.useState('');
  const [updateNotes, setUpdateNotes] = React.useState('');

  const { data: training, isLoading, isError } = trpc.hr.training.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const { data: employees } = trpc.hr.employees.list.useQuery({ page: 1, limit: 500 });

  const { data: enrollmentsData, refetch: refetchEnrollments } =
    trpc.hr.training.enrollments.list.useQuery(
      { trainingId: params.id },
      { enabled: !!params.id },
    );

  const enrollMutation = trpc.hr.training.enrollments.enroll.useMutation({
    onSuccess: () => {
      refetchEnrollments();
      utils.hr.training.byId.invalidate({ id: params.id });
      toast.success('Employee enrolled');
      setEnrollDialogOpen(false);
      setSelectedEmployeeId('');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEnrollmentStatusMutation =
    trpc.hr.training.enrollments.updateStatus.useMutation({
      onSuccess: () => {
        refetchEnrollments();
        toast.success('Enrollment status updated');
        setUpdateStatusDialogOpen(false);
        setSelectedEnrollment(null);
        setUpdateStatusValue('');
        setUpdateScore('');
        setUpdateNotes('');
      },
      onError: (e) => toast.error(e.message),
    });

  const unenrollMutation = trpc.hr.training.enrollments.unenroll.useMutation({
    onSuccess: () => {
      refetchEnrollments();
      utils.hr.training.byId.invalidate({ id: params.id });
      toast.success('Employee unenrolled');
    },
    onError: (e) => toast.error(e.message),
  });

  const enrollments = Array.isArray(enrollmentsData)
    ? enrollmentsData
    : (enrollmentsData as any)?.data ?? [];
  const employeeList = Array.isArray(employees)
    ? employees
    : (employees as any)?.data ?? [];

  const isPending =
    enrollMutation.isPending ||
    updateEnrollmentStatusMutation.isPending ||
    unenrollMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isError || !training) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia><GraduationCap className="size-16" /></EmptyMedia>
            <EmptyTitle>Training not found</EmptyTitle>
            <EmptyDescription>The training program you're looking for doesn't exist or has been deleted.</EmptyDescription>
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
            <Button variant="ghost" size="icon" onClick={() => router.push('/hrms/training')}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{training.name}</h1>
                <Badge variant="outline" className={STATUS_COLORS[training.status] ?? ''}>
                  {training.status?.replace(/_/g, ' ')}
                </Badge>
                {training.isMandatory && (
                  <Badge variant="outline" className="bg-red-100 text-red-800">Mandatory</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {training.provider && <span>{training.provider}</span>}
                {training.durationHours && <span> · {training.durationHours}h</span>}
                {training.cost != null && <span> · {Number(training.cost).toFixed(3)}</span>}
                {training.startDate && (
                  <span>
                    {' '}· {format(new Date(training.startDate), 'dd MMM yyyy')}
                    {training.endDate && ` - ${format(new Date(training.endDate), 'dd MMM yyyy')}`}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Description */}
        {training.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{training.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Enrollments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" /> Enrollments ({enrollments.length})
              </CardTitle>
              <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
                <UserPlus className="size-4 mr-1" /> Enroll
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No enrollments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{enrollment.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{enrollment.employee?.employeeCode}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[enrollment.status] ?? ''}>
                          {enrollment.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{enrollment.score != null ? enrollment.score : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {enrollment.notes ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {enrollment.completedAt
                          ? format(new Date(enrollment.completedAt), 'dd MMM yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedEnrollment(enrollment);
                                setUpdateStatusValue(enrollment.status);
                                setUpdateScore(enrollment.score?.toString() ?? '');
                                setUpdateNotes(enrollment.notes ?? '');
                                setUpdateStatusDialogOpen(true);
                              }}
                            >
                              Update Status
                            </DropdownMenuItem>
                            {enrollment.status === 'PLANNED' && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  alert.delete({
                                    title: 'Unenroll Employee',
                                    description: `Remove ${enrollment.employee?.user?.name} from this training?`,
                                    confirmText: 'Unenroll',
                                    onConfirm: async () => {
                                      await unenrollMutation.mutateAsync({ id: enrollment.id });
                                    },
                                  })
                                }
                              >
                                Unenroll
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Employee</DialogTitle>
            <DialogDescription>Select an employee to enroll in this training program.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employeeList.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.user?.name} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEnrollDialogOpen(false); setSelectedEmployeeId(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                enrollMutation.mutate({ trainingId: params.id, employeeId: selectedEmployeeId })
              }
              disabled={enrollMutation.isPending || !selectedEmployeeId}
            >
              {enrollMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Enrollment Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Enrollment Status</DialogTitle>
            <DialogDescription>
              Update the status and optionally add a score and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={updateStatusValue} onValueChange={setUpdateStatusValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score (optional)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={updateScore}
                onChange={(e) => setUpdateScore(e.target.value)}
                placeholder="0-100"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                updateEnrollmentStatusMutation.mutate({
                  id: selectedEnrollment?.id,
                  status: updateStatusValue as any,
                  score: updateScore ? parseInt(updateScore) : undefined,
                  notes: updateNotes || undefined,
                })
              }
              disabled={updateEnrollmentStatusMutation.isPending || !updateStatusValue}
            >
              {updateEnrollmentStatusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
