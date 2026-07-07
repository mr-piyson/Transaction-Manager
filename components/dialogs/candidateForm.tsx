'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
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
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  jobPostingId: z.string().optional(),
});

export type CandidateFormValues = z.infer<typeof schema>;

export interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: { id: string } & Partial<CandidateFormValues>;
  onSuccess?: (id: string) => void;
}

export function CandidateFormDialog({ open, onOpenChange, candidate, onSuccess }: CandidateFormDialogProps) {
  const isEdit = Boolean(candidate?.id);
  const utils = trpc.useUtils();

  const { data: jobPostingsData } = trpc.hr.recruitment.jobPostings.list.useQuery({});

  const createMutation = trpc.hr.recruitment.candidates.create.useMutation({
    onSuccess: (res) => {
      utils.hr.recruitment.candidates.list.invalidate();
      toast.success('Candidate created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.recruitment.candidates.update.useMutation({
    onSuccess: () => {
      utils.hr.recruitment.candidates.list.invalidate();
      if (candidate?.id) utils.hr.recruitment.candidates.byId.invalidate({ id: candidate.id });
      toast.success('Candidate updated successfully');
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
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(candidate) as any,
  });

  React.useEffect(() => {
    reset(defaults(candidate));
  }, [candidate, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && candidate?.id) {
      await updateMutation.mutateAsync({ id: candidate.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const jobPostings = Array.isArray(jobPostingsData) ? jobPostingsData : (jobPostingsData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            {isEdit ? 'Edit Candidate' : 'Create Candidate'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the candidate details below.' : 'Fill in the details to create a new candidate.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input id="resumeUrl" {...register('resumeUrl')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="coverLetter">Cover Letter</Label>
              <Input id="coverLetter" {...register('coverLetter')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="source">Source</Label>
              <Input id="source" {...register('source')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="jobPostingId">Job Posting</Label>
              <Select
                value={watch('jobPostingId')}
                onValueChange={(v) => setValue('jobPostingId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select posting" /></SelectTrigger>
                <SelectContent>
                  {jobPostings.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

interface CandidateFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    candidate: { id: string } & Partial<CandidateFormValues>,
    options?: OpenOptions,
  ) => void;
}

const CandidateFormContext = React.createContext<CandidateFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  candidate?: { id: string } & Partial<CandidateFormValues>;
  onSuccess?: (id: string) => void;
}

export function CandidateFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, candidate: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (candidate: { id: string } & Partial<CandidateFormValues>, options?: OpenOptions) => {
      setState({ open: true, candidate, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <CandidateFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <CandidateFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        candidate={state.candidate}
        onSuccess={state.onSuccess}
      />
    </CandidateFormContext.Provider>
  );
}

export function useCandidateForm(): CandidateFormContextValue {
  const ctx = React.useContext(CandidateFormContext);
  if (!ctx) throw new Error('useCandidateForm must be used inside <CandidateFormProvider>');
  return ctx;
}

function defaults(candidate?: { id: string } & Partial<CandidateFormValues>): CandidateFormValues {
  return {
    firstName: candidate?.firstName ?? '',
    lastName: candidate?.lastName ?? '',
    email: candidate?.email ?? '',
    phone: candidate?.phone ?? undefined,
    resumeUrl: candidate?.resumeUrl ?? undefined,
    coverLetter: candidate?.coverLetter ?? undefined,
    source: candidate?.source ?? undefined,
    notes: candidate?.notes ?? undefined,
    jobPostingId: candidate?.jobPostingId ?? undefined,
  };
}
