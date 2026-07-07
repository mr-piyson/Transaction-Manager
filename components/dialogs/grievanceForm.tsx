'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
});

export type GrievanceFormValues = z.infer<typeof schema>;

export interface GrievanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function GrievanceFormDialog({ open, onOpenChange, onSuccess }: GrievanceFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.employeeRelations.grievances.create.useMutation({
    onSuccess: (res) => {
      utils.hr.employeeRelations.grievances.list.invalidate();
      toast.success('Grievance submitted successfully');
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
  } = useForm<GrievanceFormValues>({
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
            <AlertTriangle className="size-5" />
            Submit Grievance
          </DialogTitle>
          <DialogDescription>
            Fill in the details to submit a new grievance.
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

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" {...register('subject')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
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
              Submit
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

interface GrievanceFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const GrievanceFormContext = React.createContext<GrievanceFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  onSuccess?: (id: string) => void;
}

export function GrievanceFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <GrievanceFormContext.Provider value={{ openCreate }}>
      {children}
      <GrievanceFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        onSuccess={state.onSuccess}
      />
    </GrievanceFormContext.Provider>
  );
}

export function useGrievanceForm(): GrievanceFormContextValue {
  const ctx = React.useContext(GrievanceFormContext);
  if (!ctx) throw new Error('useGrievanceForm must be used inside <GrievanceFormProvider>');
  return ctx;
}

function defaults(): GrievanceFormValues {
  return {
    employeeId: '',
    subject: '',
    description: '',
  };
}
