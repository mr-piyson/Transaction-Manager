'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Loader2 } from 'lucide-react';
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

const ratingValues = ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'POOR'] as const;

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  reviewerId: z.string().min(1, 'Reviewer is required'),
  reviewPeriod: z.string().min(1, 'Review period is required'),
  reviewDate: z.string().min(1, 'Review date is required'),
  rating: z.enum(ratingValues),
  comments: z.string().optional(),
  goals: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
});

export type PerformanceReviewFormValues = z.infer<typeof schema>;

export interface PerformanceReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performanceReview?: { id: string } & Partial<PerformanceReviewFormValues>;
  onSuccess?: (id: string) => void;
}

export function PerformanceReviewFormDialog({ open, onOpenChange, performanceReview, onSuccess }: PerformanceReviewFormDialogProps) {
  const isEdit = Boolean(performanceReview?.id);
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.performance.create.useMutation({
    onSuccess: (res) => {
      utils.hr.performance.list.invalidate();
      toast.success('Performance review created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.performance.update.useMutation({
    onSuccess: () => {
      utils.hr.performance.list.invalidate();
      if (performanceReview?.id) utils.hr.performance.byId.invalidate({ id: performanceReview.id });
      toast.success('Performance review updated successfully');
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
  } = useForm<PerformanceReviewFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(performanceReview) as any,
  });

  React.useEffect(() => {
    reset(defaults(performanceReview));
  }, [performanceReview, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && performanceReview?.id) {
      await updateMutation.mutateAsync({ id: performanceReview.id, ...values });
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
            <BarChart3 className="size-5" />
            {isEdit ? 'Edit Performance Review' : 'Create Performance Review'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the performance review details below.' : 'Fill in the details to create a new performance review.'}
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
              <Label htmlFor="reviewerId">Reviewer *</Label>
              <Select
                value={watch('reviewerId')}
                onValueChange={(v) => setValue('reviewerId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="reviewPeriod">Review Period *</Label>
              <Input id="reviewPeriod" placeholder="e.g. Q1 2026" {...register('reviewPeriod')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="reviewDate">Review Date *</Label>
              <Input id="reviewDate" type="date" {...register('reviewDate')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="rating">Rating *</Label>
              <Select
                value={watch('rating')}
                onValueChange={(v) => setValue('rating', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ratingValues.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="comments">Comments</Label>
              <Input id="comments" {...register('comments')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="goals">Goals</Label>
              <Input id="goals" {...register('goals')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="strengths">Strengths</Label>
              <Input id="strengths" {...register('strengths')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="weaknesses">Weaknesses</Label>
              <Input id="weaknesses" {...register('weaknesses')} />
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

interface PerformanceReviewFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    performanceReview: { id: string } & Partial<PerformanceReviewFormValues>,
    options?: OpenOptions,
  ) => void;
}

const PerformanceReviewFormContext = React.createContext<PerformanceReviewFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  performanceReview?: { id: string } & Partial<PerformanceReviewFormValues>;
  onSuccess?: (id: string) => void;
}

export function PerformanceReviewFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, performanceReview: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (performanceReview: { id: string } & Partial<PerformanceReviewFormValues>, options?: OpenOptions) => {
      setState({ open: true, performanceReview, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <PerformanceReviewFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <PerformanceReviewFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        performanceReview={state.performanceReview}
        onSuccess={state.onSuccess}
      />
    </PerformanceReviewFormContext.Provider>
  );
}

export function usePerformanceReviewForm(): PerformanceReviewFormContextValue {
  const ctx = React.useContext(PerformanceReviewFormContext);
  if (!ctx) throw new Error('usePerformanceReviewForm must be used inside <PerformanceReviewFormProvider>');
  return ctx;
}

function defaults(performanceReview?: { id: string } & Partial<PerformanceReviewFormValues>): PerformanceReviewFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    employeeId: performanceReview?.employeeId ?? '',
    reviewerId: performanceReview?.reviewerId ?? '',
    reviewPeriod: performanceReview?.reviewPeriod ?? '',
    reviewDate: performanceReview?.reviewDate ?? today,
    rating: (performanceReview?.rating as any) ?? 'GOOD',
    comments: performanceReview?.comments ?? undefined,
    goals: performanceReview?.goals ?? undefined,
    strengths: performanceReview?.strengths ?? undefined,
    weaknesses: performanceReview?.weaknesses ?? undefined,
  };
}
