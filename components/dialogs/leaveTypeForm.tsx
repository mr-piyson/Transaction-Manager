'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Umbrella } from 'lucide-react';
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
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  daysPerYear: z.coerce.number().default(30),
  isPaid: z.boolean().default(true),
});

export type LeaveTypeFormValues = z.infer<typeof schema>;

export interface LeaveTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveType?: { id: string } & Partial<LeaveTypeFormValues>;
  onSuccess?: (id: string) => void;
}

export function LeaveTypeFormDialog({ open, onOpenChange, leaveType, onSuccess }: LeaveTypeFormDialogProps) {
  const isEdit = Boolean(leaveType?.id);
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.leave.types.create.useMutation({
    onSuccess: (res) => {
      utils.hr.leave.types.list.invalidate();
      toast.success('Leave type created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.leave.types.update.useMutation({
    onSuccess: () => {
      utils.hr.leave.types.list.invalidate();
      if (leaveType?.id) utils.hr.leave.types.byId.invalidate({ id: leaveType.id });
      toast.success('Leave type updated successfully');
      onOpenChange(false);
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
  } = useForm<LeaveTypeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(leaveType) as any,
  });

  React.useEffect(() => {
    reset(defaults(leaveType));
  }, [leaveType, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && leaveType?.id) {
      await updateMutation.mutateAsync({ id: leaveType.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Umbrella className="size-5" />
            {isEdit ? 'Edit Leave Type' : 'Create Leave Type'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the leave type details below.' : 'Fill in the details to create a new leave type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" {...register('code')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="daysPerYear">Days Per Year</Label>
              <Input id="daysPerYear" type="number" {...register('daysPerYear')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="isPaid">Is Paid</Label>
              <Select
                value={watch('isPaid') ? 'true' : 'false'}
                onValueChange={(v) => setValue('isPaid', v === 'true', { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
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
              {isEdit ? 'Update' : 'Create'}
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

interface LeaveTypeFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    leaveType: { id: string } & Partial<LeaveTypeFormValues>,
    options?: OpenOptions,
  ) => void;
}

const LeaveTypeFormContext = React.createContext<LeaveTypeFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  leaveType?: { id: string } & Partial<LeaveTypeFormValues>;
  onSuccess?: (id: string) => void;
}

export function LeaveTypeFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, leaveType: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (leaveType: { id: string } & Partial<LeaveTypeFormValues>, options?: OpenOptions) => {
      setState({ open: true, leaveType, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <LeaveTypeFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <LeaveTypeFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        leaveType={state.leaveType}
        onSuccess={state.onSuccess}
      />
    </LeaveTypeFormContext.Provider>
  );
}

export function useLeaveTypeForm(): LeaveTypeFormContextValue {
  const ctx = React.useContext(LeaveTypeFormContext);
  if (!ctx) throw new Error('useLeaveTypeForm must be used inside <LeaveTypeFormProvider>');
  return ctx;
}

function defaults(leaveType?: { id: string } & Partial<LeaveTypeFormValues>): LeaveTypeFormValues {
  return {
    name: leaveType?.name ?? '',
    code: leaveType?.code ?? '',
    description: leaveType?.description ?? undefined,
    daysPerYear: leaveType?.daysPerYear ?? 30,
    isPaid: leaveType?.isPaid ?? true,
  };
}
