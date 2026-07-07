'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  year: z.coerce.number().default(new Date().getFullYear()),
  allocatedDays: z.coerce.number().min(1, 'Allocated days must be at least 1'),
  carriedForwardDays: z.coerce.number().default(0),
});

export type LeaveAllocateFormValues = z.infer<typeof schema>;

export interface LeaveAllocateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function LeaveAllocateFormDialog({ open, onOpenChange, onSuccess }: LeaveAllocateFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });
  const { data: leaveTypesData } = trpc.hr.leave.types.list.useQuery({});

  const allocateMutation = trpc.hr.leave.balances.allocate.useMutation({
    onSuccess: () => {
      utils.hr.leave.balances.list.invalidate();
      toast.success('Leave allocated successfully');
      onOpenChange(false);
      onSuccess?.('' as any);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaveAllocateFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults() as any,
  });

  React.useEffect(() => {
    reset(defaults());
  }, [reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    await allocateMutation.mutateAsync(values);
  };

  const isPending = allocateMutation.isPending;

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : (leaveTypesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5" />
            Allocate Leave
          </DialogTitle>
          <DialogDescription>
            Fill in the details to allocate leave to an employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                value={watch('employeeId')}
                onValueChange={(v) => setValue('employeeId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="leaveTypeId">Leave Type *</Label>
              <Select
                value={watch('leaveTypeId')}
                onValueChange={(v) => setValue('leaveTypeId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" {...register('year')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="allocatedDays">Allocated Days *</Label>
              <Input id="allocatedDays" type="number" {...register('allocatedDays')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="carriedForwardDays">Carried Forward Days</Label>
              <Input id="carriedForwardDays" type="number" {...register('carriedForwardDays')} />
            </Field>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {Object.values(errors).map((err, i) => (
                <p key={i}>{err?.message as string}</p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Allocate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface LeaveAllocateFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const LeaveAllocateFormContext = React.createContext<LeaveAllocateFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  onSuccess?: (id: string) => void;
}

export function LeaveAllocateFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <LeaveAllocateFormContext.Provider value={{ openCreate }}>
      {children}
      <LeaveAllocateFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        onSuccess={state.onSuccess}
      />
    </LeaveAllocateFormContext.Provider>
  );
}

export function useLeaveAllocateForm(): LeaveAllocateFormContextValue {
  const ctx = React.useContext(LeaveAllocateFormContext);
  if (!ctx) throw new Error('useLeaveAllocateForm must be used inside <LeaveAllocateFormProvider>');
  return ctx;
}

function defaults(): LeaveAllocateFormValues {
  return {
    employeeId: '',
    leaveTypeId: '',
    year: new Date().getFullYear(),
    allocatedDays: undefined as any,
    carriedForwardDays: 0,
  };
}
