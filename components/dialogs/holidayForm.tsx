'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Loader2 } from 'lucide-react';
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
import { toDateInputValue } from '@/lib/date';
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
  date: z.string().min(1, 'Date is required'),
  isRecurringAnnual: z.boolean().default(false),
  description: z.string().optional(),
});

export type HolidayFormValues = z.infer<typeof schema>;

export interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday?: { id: string } & Partial<HolidayFormValues>;
  onSuccess?: (id: string) => void;
}

export function HolidayFormDialog({ open, onOpenChange, holiday, onSuccess }: HolidayFormDialogProps) {
  const isEdit = Boolean(holiday?.id);
  const utils = trpc.useUtils();

  const createMutation = trpc.hr.leave.holidays.create.useMutation({
    onSuccess: (res) => {
      utils.hr.leave.holidays.list.invalidate();
      toast.success('Holiday created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hr.leave.holidays.update.useMutation({
    onSuccess: () => {
      utils.hr.leave.holidays.list.invalidate();
      toast.success('Holiday updated successfully');
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
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(holiday) as any,
  });

  React.useEffect(() => {
    reset(defaults(holiday));
  }, [holiday, reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    if (isEdit && holiday?.id) {
      await updateMutation.mutateAsync({ id: holiday.id, ...values });
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
            <CalendarDays className="size-5" />
            {isEdit ? 'Edit Holiday' : 'Create Holiday'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the holiday details below.' : 'Fill in the details to create a new holiday.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="date">Date *</Label>
              <DatePickerField id="date" {...register('date')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="isRecurringAnnual">Recurring Annually</Label>
              <Select
                value={watch('isRecurringAnnual') ? 'true' : 'false'}
                onValueChange={(v) => setValue('isRecurringAnnual', v === 'true', { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
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

interface HolidayFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    holiday: { id: string } & Partial<HolidayFormValues>,
    options?: OpenOptions,
  ) => void;
}

const HolidayFormContext = React.createContext<HolidayFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  holiday?: { id: string } & Partial<HolidayFormValues>;
  onSuccess?: (id: string) => void;
}

export function HolidayFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, holiday: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (holiday: { id: string } & Partial<HolidayFormValues>, options?: OpenOptions) => {
      setState({ open: true, holiday, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <HolidayFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <HolidayFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        holiday={state.holiday}
        onSuccess={state.onSuccess}
      />
    </HolidayFormContext.Provider>
  );
}

export function useHolidayForm(): HolidayFormContextValue {
  const ctx = React.useContext(HolidayFormContext);
  if (!ctx) throw new Error('useHolidayForm must be used inside <HolidayFormProvider>');
  return ctx;
}

function defaults(holiday?: { id: string } & Partial<HolidayFormValues>): HolidayFormValues {
  const today = toDateInputValue(new Date());
  return {
    name: holiday?.name ?? '',
    date: holiday?.date ?? today,
    isRecurringAnnual: holiday?.isRecurringAnnual ?? false,
    description: holiday?.description ?? undefined,
  };
}
