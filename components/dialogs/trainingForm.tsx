'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Loader2 } from 'lucide-react';
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

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  provider: z.string().optional(),
  durationHours: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  currency: z.string().default('BHD'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isMandatory: z.boolean().default(false),
});

export type TrainingFormValues = z.infer<typeof schema>;

export interface TrainingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training?: { id: string } & Partial<TrainingFormValues>;
  onSuccess?: (id: string) => void;
}

export function TrainingFormDialog({ open, onOpenChange, training, onSuccess }: TrainingFormDialogProps) {
  const isEdit = Boolean(training?.id);
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.training.create.useMutation({
    onSuccess: (res) => {
      utils.hr.training.list.invalidate();
      toast.success('Training created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.training.update.useMutation({
    onSuccess: () => {
      utils.hr.training.list.invalidate();
      if (training?.id) utils.hr.training.byId.invalidate({ id: training.id });
      toast.success('Training updated successfully');
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
  } = useForm<TrainingFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(training) as any,
  });

  React.useEffect(() => {
    reset(defaults(training));
  }, [training, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && training?.id) {
      await updateMutation.mutateAsync({ id: training.id, ...values });
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
            <GraduationCap className="size-5" />
            {isEdit ? 'Edit Training' : 'Create Training'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the training details below.' : 'Fill in the details to create a new training.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="provider">Provider</Label>
              <Input id="provider" {...register('provider')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="durationHours">Duration (hours)</Label>
              <Input id="durationHours" type="number" step="0.5" {...register('durationHours')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" step="0.001" {...register('cost')} />
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
              <Label htmlFor="startDate">Start Date</Label>
              <DatePickerField id="startDate" {...register('startDate')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="endDate">End Date</Label>
              <DatePickerField id="endDate" {...register('endDate')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="isMandatory">Is Mandatory</Label>
              <Select
                value={watch('isMandatory') ? 'true' : 'false'}
                onValueChange={(v) => setValue('isMandatory', v === 'true', { shouldValidate: true })}
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

interface TrainingFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    training: { id: string } & Partial<TrainingFormValues>,
    options?: OpenOptions,
  ) => void;
}

const TrainingFormContext = React.createContext<TrainingFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  training?: { id: string } & Partial<TrainingFormValues>;
  onSuccess?: (id: string) => void;
}

export function TrainingFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, training: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (training: { id: string } & Partial<TrainingFormValues>, options?: OpenOptions) => {
      setState({ open: true, training, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <TrainingFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <TrainingFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        training={state.training}
        onSuccess={state.onSuccess}
      />
    </TrainingFormContext.Provider>
  );
}

export function useTrainingForm(): TrainingFormContextValue {
  const ctx = React.useContext(TrainingFormContext);
  if (!ctx) throw new Error('useTrainingForm must be used inside <TrainingFormProvider>');
  return ctx;
}

function defaults(training?: { id: string } & Partial<TrainingFormValues>): TrainingFormValues {
  return {
    name: training?.name ?? '',
    description: training?.description ?? undefined,
    provider: training?.provider ?? undefined,
    durationHours: training?.durationHours ?? undefined,
    cost: training?.cost ?? undefined,
    currency: training?.currency ?? 'BHD',
    startDate: training?.startDate ?? undefined,
    endDate: training?.endDate ?? undefined,
    isMandatory: training?.isMandatory ?? false,
  };
}
