'use client';

import {
  ArrowLeft,
  Banknote,
  DollarSign,
  Edit3,
  Loader2,
  Trash2,
  User,
  Wallet,
  XCircle,
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
  PROCESSING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
};

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [editItemDialog, setEditItemDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');

  const { data: payroll, isLoading, isError } = trpc.hr.payroll.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const processMutation = trpc.hr.payroll.process.useMutation({
    onSuccess: () => {
      utils.hr.payroll.byId.invalidate({ id: params.id });
      utils.hr.payroll.list.invalidate();
      toast.success('Payroll processing started');
    },
    onError: (e) => toast.error(e.message),
  });

  const completeMutation = trpc.hr.payroll.complete.useMutation({
    onSuccess: () => {
      utils.hr.payroll.byId.invalidate({ id: params.id });
      utils.hr.payroll.list.invalidate();
      toast.success('Payroll completed');
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.hr.payroll.cancel.useMutation({
    onSuccess: () => {
      utils.hr.payroll.byId.invalidate({ id: params.id });
      utils.hr.payroll.list.invalidate();
      toast.success('Payroll cancelled');
      setCancelDialogOpen(false);
      setCancelReason('');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.hr.payroll.delete.useMutation({
    onSuccess: () => {
      utils.hr.payroll.list.invalidate();
      toast.success('Payroll deleted');
      router.push('/hrms/payroll');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItemMutation = trpc.hr.payroll.items.update.useMutation({
    onSuccess: () => {
      utils.hr.payroll.byId.invalidate({ id: params.id });
      toast.success('Payroll item updated');
      setEditItemDialog(false);
      setEditingItem(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    processMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending ||
    updateItemMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isError || !payroll) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia><Wallet className="size-16" /></EmptyMedia>
            <EmptyTitle>Payroll not found</EmptyTitle>
            <EmptyDescription>The payroll run you're looking for doesn't exist or has been deleted.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const items = payroll.items ?? [];
  const totalSalary = items.reduce((s: number, i: any) => s + Number(i.baseSalary ?? 0), 0);
  const totalAllowances = items.reduce((s: number, i: any) => s + Number(i.allowances ?? 0), 0);
  const totalDeductions = items.reduce((s: number, i: any) => s + Number(i.deductions ?? 0), 0);
  const totalNet = items.reduce((s: number, i: any) => s + Number(i.netPay ?? 0), 0);

  const handleEditItem = (item: any) => {
    setEditingItem({
      id: item.id,
      allowances: item.allowances?.toString() ?? '',
      deductions: item.deductions?.toString() ?? '',
      bonus: item.bonus?.toString() ?? '',
      overtime: item.overtime?.toString() ?? '',
      tax: item.tax?.toString() ?? '',
      notes: item.notes ?? '',
    });
    setEditItemDialog(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/hrms/payroll')}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{payroll.name}</h1>
                <Badge variant="outline" className={STATUS_COLORS[payroll.status] ?? ''}>
                  {payroll.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {payroll.periodStart && payroll.periodEnd
                  ? `${format(new Date(payroll.periodStart), 'dd MMM yyyy')} - ${format(new Date(payroll.periodEnd), 'dd MMM yyyy')}`
                  : 'No period set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {payroll.status === 'DRAFT' && (
              <>
                <Button
                  size="sm"
                  onClick={() => processMutation.mutate({ id: params.id })}
                  disabled={isPending}
                >
                  {processMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Process
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => completeMutation.mutate({ id: params.id })}
                  disabled={isPending || items.length === 0}
                >
                  {completeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={isPending}
                >
                  <XCircle className="size-4 mr-1" /> Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    alert.delete({
                      title: 'Delete Payroll Run',
                      description: 'Are you sure you want to delete this payroll run? This action cannot be undone.',
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
              </>
            )}
            {payroll.status === 'PROCESSING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isPending}
              >
                <XCircle className="size-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Salaries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{totalSalary.toFixed(3)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{totalDeductions.toFixed(3)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{totalNet.toFixed(3)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" /> Payroll Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Bank Account / Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No items in this payroll run.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.employee?.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.employee?.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.baseSalary != null ? Number(item.baseSalary).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.allowances != null ? Number(item.allowances).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.deductions != null ? Number(item.deductions).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {item.netPay != null ? Number(item.netPay).toFixed(3) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.employee?.bankName
                          ? `${item.employee.bankName}${item.employee.bankAccount ? ` (${item.employee.bankAccount})` : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {item.notes ?? '—'}
                      </TableCell>
                      <TableCell>
                        {payroll.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Payroll Run</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling this payroll run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason (required)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Close</Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelMutation.mutate({ id: params.id, reason: cancelReason })
              }
              disabled={cancelMutation.isPending || !cancelReason.trim()}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Cancel Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Payroll Item</DialogTitle>
            <DialogDescription>
              Update allowances, deductions, and other values for this employee.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingItem.allowances}
                  onChange={(e) => setEditingItem({ ...editingItem, allowances: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingItem.deductions}
                  onChange={(e) => setEditingItem({ ...editingItem, deductions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingItem.bonus}
                  onChange={(e) => setEditingItem({ ...editingItem, bonus: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingItem.overtime}
                  onChange={(e) => setEditingItem({ ...editingItem, overtime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingItem.tax}
                  onChange={(e) => setEditingItem({ ...editingItem, tax: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditItemDialog(false); setEditingItem(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateItemMutation.mutate({
                  id: editingItem.id,
                  allowances: parseFloat(editingItem.allowances) || 0,
                  deductions: parseFloat(editingItem.deductions) || 0,
                  bonus: parseFloat(editingItem.bonus) || 0,
                  overtime: parseFloat(editingItem.overtime) || 0,
                  tax: parseFloat(editingItem.tax) || 0,
                  notes: editingItem.notes || undefined,
                })
              }
              disabled={updateItemMutation.isPending}
            >
              {updateItemMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
