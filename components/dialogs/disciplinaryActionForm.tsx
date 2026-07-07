'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Gavel, Loader2 } from 'lucide-react';
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

const typeValues = ['VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION', 'TERMINATION'] as const;

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: z.enum(typeValues),
  reason: z.string().min(1, 'Reason is required'),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
});

export type DisciplinaryActionFormValues = z.infer<typeof schema>;

export interface DisciplinaryActionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function DisciplinaryActionFormDialog({ open, onOpenChange, onSuccess }: DisciplinaryActionFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.employeeRelations.disciplinaryActions.create.useMutation({
    onSuccess: (res) => {
      utils.hr.employeeRelations.disciplinaryActions.list.invalidate();
      toast.success('Disciplinary action recorded successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
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
  } = useForm<DisciplinaryActionFormValues>({
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

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="size-5" />
            Record Disciplinary Action
          </DialogTitle>
          <DialogDescription>
            Fill in the details to record a disciplinary action.
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
              <Label htmlFor="type">Type *</Label>
              <Select
                value={watch('type')}
                onValueChange={(v) => setValue('type', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeValues.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="reason">Reason *</Label>
              <Input id="reason" {...register('reason')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="documentUrl">Document URL</Label>
              <Input id="documentUrl" {...register('documentUrl')} />
            </Field>

            <Field orientation="vertical">
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
              Record
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

interface DisciplinaryActionFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const DisciplinaryActionFormContext = React.createContext<DisciplinaryActionFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  onSuccess?: (id: string) => void;
}

export function DisciplinaryActionFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <DisciplinaryActionFormContext.Provider value={{ openCreate }}>
      {children}
      <DisciplinaryActionFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        onSuccess={state.onSuccess}
      />
    </DisciplinaryActionFormContext.Provider>
  );
}

export function useDisciplinaryActionForm(): DisciplinaryActionFormContextValue {
  const ctx = React.useContext(DisciplinaryActionFormContext);
  if (!ctx) throw new Error('useDisciplinaryActionForm must be used inside <DisciplinaryActionFormProvider>');
  return ctx;
}

function defaults(): DisciplinaryActionFormValues {
  return {
    employeeId: '',
    type: 'VERBAL_WARNING' as any,
    reason: '',
    documentUrl: undefined,
    notes: undefined,
  };
}
