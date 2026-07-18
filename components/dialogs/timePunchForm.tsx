'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Loader2 } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
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
import { DateInputField } from '@/components/ui/date-picker';
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
  timestamp: z.string().min(1, 'Timestamp is required'),
  source: z.string().max(100).optional(),
  punchState: z.string().max(10).optional(),
});

type TimePunchFormValues = z.infer<typeof schema>;

export interface TimePunchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TimePunchFormDialog({ open, onOpenChange, onSuccess }: TimePunchFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});

  const createMutation = trpc.hr.attendance.timePunches.create.useMutation({
    onSuccess: () => {
      utils.hr.attendance.timePunches.list.invalidate();
      toast.success('Time punch created');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TimePunchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timestamp: new Date().toISOString().slice(0, 16) },
  });

  const onSubmit: SubmitHandler<TimePunchFormValues> = async (values) => {
    await createMutation.mutateAsync({
      employeeId: values.employeeId,
      timestamp: new Date(values.timestamp),
      source: values.source || undefined,
      punchState: values.punchState || undefined,
    });
  };

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Create Time Punch
          </DialogTitle>
          <DialogDescription>Record a manual time punch for an employee.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="timestamp">Timestamp *</Label>
            <DateInputField
              control={control}
              name="timestamp"
              rules={{ required: 'Timestamp is required' }}
              required
              mode="datetime"
              showTodayButton
            />
          </Field>

          <Field orientation="vertical">
            <Label htmlFor="punchState">State</Label>
            <Select
              value={watch('punchState')}
              onValueChange={(v) => setValue('punchState', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="OUT">OUT</SelectItem>
                <SelectItem value="BREAK_IN">BREAK IN</SelectItem>
                <SelectItem value="BREAK_OUT">BREAK OUT</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="vertical">
            <Label htmlFor="source">Source</Label>
            <Input id="source" {...register('source')} placeholder="e.g. Manual, Terminal" />
          </Field>

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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface TimePunchFormContextValue {
  openCreate: (options?: { onSuccess?: () => void }) => void;
}

const TimePunchFormContext = React.createContext<TimePunchFormContextValue | null>(null);

export function TimePunchFormProvider({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [onSuccessCb, setOnSuccessCb] = React.useState<(() => void) | undefined>();

  const openCreate = React.useCallback((options?: { onSuccess?: () => void }) => {
    setOpen(true);
    setOnSuccessCb(() => options?.onSuccess);
  }, []);

  return (
    <TimePunchFormContext.Provider value={{ openCreate }}>
      {children}
      <TimePunchFormDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccessCb}
      />
    </TimePunchFormContext.Provider>
  );
}

export function useTimePunchForm(): TimePunchFormContextValue {
  const ctx = React.useContext(TimePunchFormContext);
  if (!ctx) throw new Error('useTimePunchForm must be used inside <TimePunchFormProvider>');
  return ctx;
}
