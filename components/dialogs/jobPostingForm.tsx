'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Globe, Loader2 } from 'lucide-react';
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
import { DatePickerField } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';

const employmentTypeValues = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'] as const;

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  requirements: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(employmentTypeValues).default('FULL_TIME'),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  currency: z.string().default('BHD'),
  closingDate: z.string().optional(),
  departmentId: z.string().optional(),
});

export type JobPostingFormValues = z.infer<typeof schema>;

export interface JobPostingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobPosting?: { id: string } & Partial<JobPostingFormValues>;
  onSuccess?: (id: string) => void;
}

export function JobPostingFormDialog({ open, onOpenChange, jobPosting, onSuccess }: JobPostingFormDialogProps) {
  const isEdit = Boolean(jobPosting?.id);
  const utils = trpc.useUtils();

  const { data: departmentsData } = trpc.hr.departments.list.useQuery({});

  const createMutation = trpc.hr.recruitment.jobPostings.create.useMutation({
    onSuccess: (res) => {
      utils.hr.recruitment.jobPostings.list.invalidate();
      toast.success('Job posting created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.recruitment.jobPostings.update.useMutation({
    onSuccess: () => {
      utils.hr.recruitment.jobPostings.list.invalidate();
      if (jobPosting?.id) utils.hr.recruitment.jobPostings.byId.invalidate({ id: jobPosting.id });
      toast.success('Job posting updated successfully');
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
  } = useForm<JobPostingFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(jobPosting) as any,
  });

  React.useEffect(() => {
    reset(defaults(jobPosting));
  }, [jobPosting, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && jobPosting?.id) {
      await updateMutation.mutateAsync({ id: jobPosting.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            {isEdit ? 'Edit Job Posting' : 'Create Job Posting'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the job posting details below.' : 'Fill in the details to create a new job posting.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="employmentType">Employment Type *</Label>
              <Select
                value={watch('employmentType')}
                onValueChange={(v) => setValue('employmentType', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employmentTypeValues.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} />
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
              <Label htmlFor="salaryMin">Salary Min</Label>
              <Input id="salaryMin" type="number" step="0.001" {...register('salaryMin')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="salaryMax">Salary Max</Label>
              <Input id="salaryMax" type="number" step="0.001" {...register('salaryMax')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch('currency')}
                onValueChange={(v) => setValue('currency', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="closingDate">Closing Date</Label>
              <DatePickerField id="closingDate" {...register('closingDate')} />
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

interface JobPostingFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    jobPosting: { id: string } & Partial<JobPostingFormValues>,
    options?: OpenOptions,
  ) => void;
}

const JobPostingFormContext = React.createContext<JobPostingFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  jobPosting?: { id: string } & Partial<JobPostingFormValues>;
  onSuccess?: (id: string) => void;
}

export function JobPostingFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, jobPosting: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (jobPosting: { id: string } & Partial<JobPostingFormValues>, options?: OpenOptions) => {
      setState({ open: true, jobPosting, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <JobPostingFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <JobPostingFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        jobPosting={state.jobPosting}
        onSuccess={state.onSuccess}
      />
    </JobPostingFormContext.Provider>
  );
}

export function useJobPostingForm(): JobPostingFormContextValue {
  const ctx = React.useContext(JobPostingFormContext);
  if (!ctx) throw new Error('useJobPostingForm must be used inside <JobPostingFormProvider>');
  return ctx;
}

function defaults(jobPosting?: { id: string } & Partial<JobPostingFormValues>): JobPostingFormValues {
  return {
    title: jobPosting?.title ?? '',
    description: jobPosting?.description ?? undefined,
    requirements: jobPosting?.requirements ?? undefined,
    location: jobPosting?.location ?? undefined,
    employmentType: (jobPosting?.employmentType as any) ?? 'FULL_TIME',
    salaryMin: jobPosting?.salaryMin ?? undefined,
    salaryMax: jobPosting?.salaryMax ?? undefined,
    currency: jobPosting?.currency ?? 'BHD',
    closingDate: jobPosting?.closingDate ?? undefined,
    departmentId: jobPosting?.departmentId ?? undefined,
  };
}
