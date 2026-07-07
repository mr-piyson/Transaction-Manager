'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Loader2 } from 'lucide-react';
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
import { trpc } from '@/lib/trpc/client';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: z.string().regex(timePattern, 'Must be HH:MM format'),
  endTime: z.string().regex(timePattern, 'Must be HH:MM format'),
  color: z.string().optional(),
});

export type ShiftFormValues = z.infer<typeof schema>;

export interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: { id: string } & Partial<ShiftFormValues>;
  onSuccess?: (id: string) => void;
}

export function ShiftFormDialog({ open, onOpenChange, shift, onSuccess }: ShiftFormDialogProps) {
  const isEdit = Boolean(shift?.id);
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.shifts.create.useMutation({
    onSuccess: (res) => {
      utils.hr.shifts.list.invalidate();
      toast.success('Shift created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.shifts.update.useMutation({
    onSuccess: () => {
      utils.hr.shifts.list.invalidate();
      if (shift?.id) utils.hr.shifts.byId.invalidate({ id: shift.id });
      toast.success('Shift updated successfully');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(shift) as any,
  });

  React.useEffect(() => {
    reset(defaults(shift));
  }, [shift, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && shift?.id) {
      await updateMutation.mutateAsync({ id: shift.id, ...values });
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
            <Clock className="size-5" />
            {isEdit ? 'Edit Shift' : 'Create Shift'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the shift details below.' : 'Fill in the details to create a new shift.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" {...register('color')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="endTime">End Time *</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
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

interface ShiftFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    shift: { id: string } & Partial<ShiftFormValues>,
    options?: OpenOptions,
  ) => void;
}

const ShiftFormContext = React.createContext<ShiftFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  shift?: { id: string } & Partial<ShiftFormValues>;
  onSuccess?: (id: string) => void;
}

export function ShiftFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, shift: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (shift: { id: string } & Partial<ShiftFormValues>, options?: OpenOptions) => {
      setState({ open: true, shift, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ShiftFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <ShiftFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        shift={state.shift}
        onSuccess={state.onSuccess}
      />
    </ShiftFormContext.Provider>
  );
}

export function useShiftForm(): ShiftFormContextValue {
  const ctx = React.useContext(ShiftFormContext);
  if (!ctx) throw new Error('useShiftForm must be used inside <ShiftFormProvider>');
  return ctx;
}

function defaults(shift?: { id: string } & Partial<ShiftFormValues>): ShiftFormValues {
  return {
    name: shift?.name ?? '',
    startTime: shift?.startTime ?? '09:00',
    endTime: shift?.endTime ?? '17:00',
    color: shift?.color ?? undefined,
  };
}
