'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark, Loader2 } from 'lucide-react';
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

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
  notes: z.string().optional(),
});

export type PayrollRunFormValues = z.infer<typeof schema>;

export interface PayrollRunFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function PayrollRunFormDialog({ open, onOpenChange, onSuccess }: PayrollRunFormDialogProps) {
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.payroll.create.useMutation({
    onSuccess: (res) => {
      utils.hr.payroll.list.invalidate();
      toast.success('Payroll run created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayrollRunFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults() as any,
  });

  React.useEffect(() => {
    reset(defaults());
  }, [reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  const isPending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5" />
            Create Payroll Run
          </DialogTitle>
          <DialogDescription>
            Fill in the details to create a new payroll run.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="periodStart">Period Start *</Label>
              <Input id="periodStart" type="date" {...register('periodStart')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="periodEnd">Period End *</Label>
              <Input id="periodEnd" type="date" {...register('periodEnd')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register('notes')} />
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
              Create
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

interface PayrollRunFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const PayrollRunFormContext = React.createContext<PayrollRunFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  onSuccess?: (id: string) => void;
}

export function PayrollRunFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <PayrollRunFormContext.Provider value={{ openCreate }}>
      {children}
      <PayrollRunFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        onSuccess={state.onSuccess}
      />
    </PayrollRunFormContext.Provider>
  );
}

export function usePayrollRunForm(): PayrollRunFormContextValue {
  const ctx = React.useContext(PayrollRunFormContext);
  if (!ctx) throw new Error('usePayrollRunForm must be used inside <PayrollRunFormProvider>');
  return ctx;
}

function defaults(): PayrollRunFormValues {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    name: '',
    periodStart: firstDay.toISOString().slice(0, 10),
    periodEnd: lastDay.toISOString().slice(0, 10),
    notes: undefined,
  };
}
