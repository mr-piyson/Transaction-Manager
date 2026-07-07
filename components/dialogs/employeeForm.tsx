'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, User } from 'lucide-react';
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

const statusValues = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'SUSPENDED'] as const;

const schema = z.object({
  userId: z.string().min(1, 'User is required'),
  hireDate: z.string().min(1, 'Hire date is required'),
  probationEndDate: z.string().optional(),
  status: z.enum(statusValues).default('ACTIVE'),
  phone: z.string().max(50).optional(),
  emergencyContact: z.string().max(255).optional(),
  emergencyPhone: z.string().max(50).optional(),
  bankAccount: z.string().max(100).optional(),
  bankName: z.string().max(255).optional(),
  departmentId: z.string().optional(),
  jobPositionId: z.string().optional(),
  reportsToId: z.string().optional(),
  employeeTypeId: z.string().optional(),
  salaryAmount: z.coerce.number().optional(),
  salaryCurrency: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof schema>;

export interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: { id: string } & Partial<EmployeeFormValues>;
  onSuccess?: (id: string) => void;
}

export function EmployeeFormDialog({ open, onOpenChange, employee, onSuccess }: EmployeeFormDialogProps) {
  const isEdit = Boolean(employee?.id);
  const utils = trpc.useUtils();

  const { data: usersData } = trpc.users.list.useQuery();
  const { data: departmentsData } = trpc.hr.departments.list.useQuery({});
  const { data: positionsData } = trpc.hr.jobPositions.list.useQuery({});
  const { data: employeeTypesData } = trpc.hr.employeeTypes.list.useQuery();
  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.employees.create.useMutation({
    onSuccess: (res) => {
      utils.hr.employees.list.invalidate();
      toast.success('Employee created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.employees.update.useMutation({
    onSuccess: () => {
      utils.hr.employees.list.invalidate();
      if (employee?.id) utils.hr.employees.byId.invalidate({ id: employee.id });
      toast.success('Employee updated successfully');
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
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(employee) as any,
  });

  React.useEffect(() => {
    reset(defaults(employee));
  }, [employee, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    const cleaned = { ...values };
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] === '') cleaned[k] = undefined;
    }
    if (isEdit && employee?.id) {
      await updateMutation.mutateAsync({ id: employee.id, ...cleaned });
    } else {
      await createMutation.mutateAsync(cleaned);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const users = Array.isArray(usersData) ? usersData : (usersData as any)?.data ?? [];
  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData as any)?.data ?? [];
  const positions = Array.isArray(positionsData) ? positionsData : (positionsData as any)?.data ?? [];
  const employeeTypes = Array.isArray(employeeTypesData) ? employeeTypesData : (employeeTypesData as any)?.data ?? [];
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-5" />
            {isEdit ? 'Edit Employee' : 'Create Employee'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the employee details below.' : 'Fill in the details to create a new employee.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="userId">User *</Label>
              <Select
                value={watch('userId')}
                onValueChange={(v) => setValue('userId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="hireDate">Hire Date *</Label>
              <Input id="hireDate" type="date" {...register('hireDate')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="probationEndDate">Probation End Date</Label>
              <Input id="probationEndDate" type="date" {...register('probationEndDate')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'SUSPENDED'].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="departmentId">Department</Label>
              <Select
                value={watch('departmentId')}
                onValueChange={(v) => setValue('departmentId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="jobPositionId">Job Position</Label>
              <Select
                value={watch('jobPositionId')}
                onValueChange={(v) => setValue('jobPositionId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="employeeTypeId">Employee Type</Label>
              <Select
                value={watch('employeeTypeId')}
                onValueChange={(v) => setValue('employeeTypeId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {employeeTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="reportsToId">Reports To</Label>
              <Select
                value={watch('reportsToId')}
                onValueChange={(v) => setValue('reportsToId', v, { shouldValidate: true })}
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
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" {...register('emergencyContact')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input id="emergencyPhone" {...register('emergencyPhone')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input id="bankAccount" {...register('bankAccount')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" {...register('bankName')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="salaryAmount">Salary Amount</Label>
              <Input id="salaryAmount" type="number" step="0.001" {...register('salaryAmount')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="salaryCurrency">Salary Currency</Label>
              <Select
                value={watch('salaryCurrency')}
                onValueChange={(v) => setValue('salaryCurrency', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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

// Provider + Hook

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface EmployeeFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    employee: { id: string } & Partial<EmployeeFormValues>,
    options?: OpenOptions,
  ) => void;
}

const EmployeeFormContext = React.createContext<EmployeeFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  employee?: { id: string } & Partial<EmployeeFormValues>;
  onSuccess?: (id: string) => void;
}

export function EmployeeFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, employee: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (employee: { id: string } & Partial<EmployeeFormValues>, options?: OpenOptions) => {
      setState({ open: true, employee, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <EmployeeFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <EmployeeFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        employee={state.employee}
        onSuccess={state.onSuccess}
      />
    </EmployeeFormContext.Provider>
  );
}

export function useEmployeeForm(): EmployeeFormContextValue {
  const ctx = React.useContext(EmployeeFormContext);
  if (!ctx) throw new Error('useEmployeeForm must be used inside <EmployeeFormProvider>');
  return ctx;
}

function defaults(employee?: { id: string } & Partial<EmployeeFormValues>): EmployeeFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    userId: employee?.userId ?? '',
    hireDate: employee?.hireDate ?? today,
    probationEndDate: employee?.probationEndDate ?? undefined,
    status: (employee?.status as any) ?? 'ACTIVE',
    phone: employee?.phone ?? undefined,
    emergencyContact: employee?.emergencyContact ?? undefined,
    emergencyPhone: employee?.emergencyPhone ?? undefined,
    bankAccount: employee?.bankAccount ?? undefined,
    bankName: employee?.bankName ?? undefined,
    departmentId: employee?.departmentId ?? undefined,
    jobPositionId: employee?.jobPositionId ?? undefined,
    reportsToId: employee?.reportsToId ?? undefined,
    employeeTypeId: employee?.employeeTypeId ?? undefined,
    salaryAmount: employee?.salaryAmount ?? undefined,
    salaryCurrency: employee?.salaryCurrency ?? undefined,
  };
}
