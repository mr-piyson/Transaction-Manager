'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Loader2 } from 'lucide-react';
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

const typeValues = ['ALLOWANCE', 'DEDUCTION'] as const;

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(typeValues),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  isRecurring: z.boolean().default(true),
});

export type SalaryComponentFormValues = z.infer<typeof schema>;

export interface SalaryComponentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salaryComponent?: { id: string } & Partial<SalaryComponentFormValues>;
  onSuccess?: (id: string) => void;
}

export function SalaryComponentFormDialog({ open, onOpenChange, salaryComponent, onSuccess }: SalaryComponentFormDialogProps) {
  const isEdit = Boolean(salaryComponent?.id);
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.salaryComponents.create.useMutation({
    onSuccess: (res) => {
      utils.hr.salaryComponents.list.invalidate();
      toast.success('Salary component created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.salaryComponents.update.useMutation({
    onSuccess: () => {
      utils.hr.salaryComponents.list.invalidate();
      toast.success('Salary component updated successfully');
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
  } = useForm<SalaryComponentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(salaryComponent) as any,
  });

  React.useEffect(() => {
    reset(defaults(salaryComponent));
  }, [salaryComponent, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && salaryComponent?.id) {
      await updateMutation.mutateAsync({ id: salaryComponent.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            {isEdit ? 'Edit Salary Component' : 'Create Salary Component'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the salary component details below.' : 'Fill in the details to create a new salary component.'}
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
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
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
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" type="number" step="0.001" {...register('amount')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="isRecurring">Is Recurring</Label>
              <Select
                value={watch('isRecurring') ? 'true' : 'false'}
                onValueChange={(v) => setValue('isRecurring', v === 'true', { shouldValidate: true })}
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

interface SalaryComponentFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    salaryComponent: { id: string } & Partial<SalaryComponentFormValues>,
    options?: OpenOptions,
  ) => void;
}

const SalaryComponentFormContext = React.createContext<SalaryComponentFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  salaryComponent?: { id: string } & Partial<SalaryComponentFormValues>;
  onSuccess?: (id: string) => void;
}

export function SalaryComponentFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, salaryComponent: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (salaryComponent: { id: string } & Partial<SalaryComponentFormValues>, options?: OpenOptions) => {
      setState({ open: true, salaryComponent, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <SalaryComponentFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <SalaryComponentFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        salaryComponent={state.salaryComponent}
        onSuccess={state.onSuccess}
      />
    </SalaryComponentFormContext.Provider>
  );
}

export function useSalaryComponentForm(): SalaryComponentFormContextValue {
  const ctx = React.useContext(SalaryComponentFormContext);
  if (!ctx) throw new Error('useSalaryComponentForm must be used inside <SalaryComponentFormProvider>');
  return ctx;
}

function defaults(salaryComponent?: { id: string } & Partial<SalaryComponentFormValues>): SalaryComponentFormValues {
  return {
    employeeId: salaryComponent?.employeeId ?? '',
    name: salaryComponent?.name ?? '',
    type: (salaryComponent?.type as any) ?? 'ALLOWANCE',
    amount: salaryComponent?.amount ?? undefined as any,
    isRecurring: salaryComponent?.isRecurring ?? true,
  };
}
