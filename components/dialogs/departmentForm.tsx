'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
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
  code: z.string().optional(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  parentId: z.string().optional(),
});

export type DepartmentFormValues = z.infer<typeof schema>;

export interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: { id: string } & Partial<DepartmentFormValues>;
  onSuccess?: (id: string) => void;
}

export function DepartmentFormDialog({ open, onOpenChange, department, onSuccess }: DepartmentFormDialogProps) {
  const isEdit = Boolean(department?.id);
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});
  const { data: departmentsData } = trpc.hr.departments.list.useQuery({});

  const createMutation = trpc.hr.departments.create.useMutation({
    onSuccess: (res) => {
      utils.hr.departments.list.invalidate();
      toast.success('Department created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.departments.update.useMutation({
    onSuccess: () => {
      utils.hr.departments.list.invalidate();
      if (department?.id) utils.hr.departments.byId.invalidate({ id: department.id });
      toast.success('Department updated successfully');
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
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(department) as any,
  });

  React.useEffect(() => {
    reset(defaults(department));
  }, [department, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && department?.id) {
      await updateMutation.mutateAsync({ id: department.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {isEdit ? 'Edit Department' : 'Create Department'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the department details below.' : 'Fill in the details to create a new department.'}
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

            <Field orientation="vertical">
              <Label htmlFor="managerId">Manager</Label>
              <Select
                value={watch('managerId')}
                onValueChange={(v) => setValue('managerId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="parentId">Parent Department</Label>
              <Select
                value={watch('parentId')}
                onValueChange={(v) => setValue('parentId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                <SelectContent>
                  {departments.filter((d: any) => d.id !== department?.id).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
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

interface DepartmentFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    department: { id: string } & Partial<DepartmentFormValues>,
    options?: OpenOptions,
  ) => void;
}

const DepartmentFormContext = React.createContext<DepartmentFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  department?: { id: string } & Partial<DepartmentFormValues>;
  onSuccess?: (id: string) => void;
}

export function DepartmentFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, department: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (department: { id: string } & Partial<DepartmentFormValues>, options?: OpenOptions) => {
      setState({ open: true, department, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <DepartmentFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <DepartmentFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        department={state.department}
        onSuccess={state.onSuccess}
      />
    </DepartmentFormContext.Provider>
  );
}

export function useDepartmentForm(): DepartmentFormContextValue {
  const ctx = React.useContext(DepartmentFormContext);
  if (!ctx) throw new Error('useDepartmentForm must be used inside <DepartmentFormProvider>');
  return ctx;
}

function defaults(department?: { id: string } & Partial<DepartmentFormValues>): DepartmentFormValues {
  return {
    name: department?.name ?? '',
    code: department?.code ?? undefined,
    description: department?.description ?? undefined,
    managerId: department?.managerId ?? undefined,
    parentId: department?.parentId ?? undefined,
  };
}
