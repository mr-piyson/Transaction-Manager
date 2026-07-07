'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Loader2 } from 'lucide-react';
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
  requirements: z.string().optional(),
  parentId: z.string().optional(),
});

export type JobPositionFormValues = z.infer<typeof schema>;

export interface JobPositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobPosition?: { id: string } & Partial<JobPositionFormValues>;
  onSuccess?: (id: string) => void;
}

export function JobPositionFormDialog({ open, onOpenChange, jobPosition, onSuccess }: JobPositionFormDialogProps) {
  const isEdit = Boolean(jobPosition?.id);
  const utils = trpc.useUtils();

  const { data: positionsData } = trpc.hr.jobPositions.list.useQuery({});

  const createMutation = trpc.hr.jobPositions.create.useMutation({
    onSuccess: (res) => {
      utils.hr.jobPositions.list.invalidate();
      toast.success('Job position created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.jobPositions.update.useMutation({
    onSuccess: () => {
      utils.hr.jobPositions.list.invalidate();
      if (jobPosition?.id) utils.hr.jobPositions.byId.invalidate({ id: jobPosition.id });
      toast.success('Job position updated successfully');
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
  } = useForm<JobPositionFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(jobPosition) as any,
  });

  React.useEffect(() => {
    reset(defaults(jobPosition));
  }, [jobPosition, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && jobPosition?.id) {
      await updateMutation.mutateAsync({ id: jobPosition.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const positions = Array.isArray(positionsData) ? positionsData : (positionsData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5" />
            {isEdit ? 'Edit Job Position' : 'Create Job Position'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the job position details below.' : 'Fill in the details to create a new job position.'}
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

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Input id="requirements" {...register('requirements')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="parentId">Parent Position</Label>
              <Select
                value={watch('parentId')}
                onValueChange={(v) => setValue('parentId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                <SelectContent>
                  {positions.filter((p: any) => p.id !== jobPosition?.id).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

interface JobPositionFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    jobPosition: { id: string } & Partial<JobPositionFormValues>,
    options?: OpenOptions,
  ) => void;
}

const JobPositionFormContext = React.createContext<JobPositionFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  jobPosition?: { id: string } & Partial<JobPositionFormValues>;
  onSuccess?: (id: string) => void;
}

export function JobPositionFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, jobPosition: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (jobPosition: { id: string } & Partial<JobPositionFormValues>, options?: OpenOptions) => {
      setState({ open: true, jobPosition, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <JobPositionFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <JobPositionFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        jobPosition={state.jobPosition}
        onSuccess={state.onSuccess}
      />
    </JobPositionFormContext.Provider>
  );
}

export function useJobPositionForm(): JobPositionFormContextValue {
  const ctx = React.useContext(JobPositionFormContext);
  if (!ctx) throw new Error('useJobPositionForm must be used inside <JobPositionFormProvider>');
  return ctx;
}

function defaults(jobPosition?: { id: string } & Partial<JobPositionFormValues>): JobPositionFormValues {
  return {
    name: jobPosition?.name ?? '',
    code: jobPosition?.code ?? undefined,
    description: jobPosition?.description ?? undefined,
    requirements: jobPosition?.requirements ?? undefined,
    parentId: jobPosition?.parentId ?? undefined,
  };
}
