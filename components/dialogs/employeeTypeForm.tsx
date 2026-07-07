'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserCheck } from 'lucide-react';
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
  code: z.string().optional(),
  description: z.string().optional(),
});

export type EmployeeTypeFormValues = z.infer<typeof schema>;

export interface EmployeeTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeType?: { id: string } & Partial<EmployeeTypeFormValues>;
  onSuccess?: (id: string) => void;
}

export function EmployeeTypeFormDialog({ open, onOpenChange, employeeType, onSuccess }: EmployeeTypeFormDialogProps) {
  const isEdit = Boolean(employeeType?.id);
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.employeeTypes.create.useMutation({
    onSuccess: (res) => {
      utils.hr.employeeTypes.list.invalidate();
      toast.success('Employee type created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.employeeTypes.update.useMutation({
    onSuccess: () => {
      utils.hr.employeeTypes.list.invalidate();
      if (employeeType?.id) utils.hr.employeeTypes.byId.invalidate({ id: employeeType.id });
      toast.success('Employee type updated successfully');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeTypeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(employeeType) as any,
  });

  React.useEffect(() => {
    reset(defaults(employeeType));
  }, [employeeType, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && employeeType?.id) {
      await updateMutation.mutateAsync({ id: employeeType.id, ...values });
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
            <UserCheck className="size-5" />
            {isEdit ? 'Edit Employee Type' : 'Create Employee Type'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the employee type details below.' : 'Fill in the details to create a new employee type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
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

interface EmployeeTypeFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    employeeType: { id: string } & Partial<EmployeeTypeFormValues>,
    options?: OpenOptions,
  ) => void;
}

const EmployeeTypeFormContext = React.createContext<EmployeeTypeFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  employeeType?: { id: string } & Partial<EmployeeTypeFormValues>;
  onSuccess?: (id: string) => void;
}

export function EmployeeTypeFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, employeeType: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (employeeType: { id: string } & Partial<EmployeeTypeFormValues>, options?: OpenOptions) => {
      setState({ open: true, employeeType, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <EmployeeTypeFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <EmployeeTypeFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        employeeType={state.employeeType}
        onSuccess={state.onSuccess}
      />
    </EmployeeTypeFormContext.Provider>
  );
}

export function useEmployeeTypeForm(): EmployeeTypeFormContextValue {
  const ctx = React.useContext(EmployeeTypeFormContext);
  if (!ctx) throw new Error('useEmployeeTypeForm must be used inside <EmployeeTypeFormProvider>');
  return ctx;
}

function defaults(employeeType?: { id: string } & Partial<EmployeeTypeFormValues>): EmployeeTypeFormValues {
  return {
    name: employeeType?.name ?? '',
    code: employeeType?.code ?? undefined,
    description: employeeType?.description ?? undefined,
  };
}
