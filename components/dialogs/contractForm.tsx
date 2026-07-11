'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/use-currency';
import { trpc } from '@/lib/trpc/client';
import { Label } from '@/components/ui/label';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).default('DRAFT'),
  contractValue: z.coerce.number().min(0),
  currency: z.enum(['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  renewalDate: z.string().optional(),
  renewalAlertDays: z.coerce.number().int().min(0).max(365),
  notes: z.string().optional(),
  customerId: z.string().optional(),
});

export type ContractFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof ContractFormValues, { message?: string }>>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const messages = Object.values(errors).map((e) => e?.message).filter(Boolean) as string[];
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Please fix the following</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: { id: string } & Partial<ContractFormValues>;
  onSuccess?: (contractId: string) => void;
}

export function ContractFormDialog({ open, onOpenChange, contract, onSuccess }: ContractFormDialogProps) {
  const isEdit = Boolean(contract?.id);
  const utils = trpc.useUtils();
  const { currency: orgCurrency } = useCurrency();
  const { data: customersData } = trpc.customers.list.useQuery({ limit: 200 });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ContractFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(contract, orgCurrency),
  });

  React.useEffect(() => {
    if (open) reset(defaults(contract, orgCurrency));
  }, [open, contract, orgCurrency, reset]);

  const watchCustomerId = watch('customerId');
  const watchCurrency = watch('currency');
  const watchStatus = watch('status');

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess(data) {
      utils.contracts.list.invalidate();
      toast.success('Contract created', { description: data.title });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to create contract', { description: err.message }); },
  });

  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess(data) {
      utils.contracts.list.invalidate();
      toast.success('Contract updated', { description: data.title });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to update contract', { description: err.message }); },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<ContractFormValues> = (values) => {
    const payload = {
      ...values,
      startDate: new Date(values.startDate),
      endDate: new Date(values.endDate),
      renewalDate: values.renewalDate ? new Date(values.renewalDate) : undefined,
    };
    if (isEdit && contract?.id) {
      updateMutation.mutate({ id: contract.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const customers = Array.isArray(customersData) ? customersData : customersData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-160">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit contract' : 'New contract'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details below and save.' : 'Fill in the details to create a new contract.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
            <Field>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="Annual Maintenance Contract" aria-invalid={!!errors.title} {...register('title')} />
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" className="resize-none" rows={2} {...register('description')} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watchStatus}
                  onValueChange={(v) => setValue('status', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="customerId">Customer</Label>
                <Select
                  value={watchCustomerId ?? ''}
                  onValueChange={(v) => setValue('customerId', v || undefined)}
                >
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="contractValue">Contract value</Label>
                <Input id="contractValue" type="number" min={0} step="0.001" {...register('contractValue')} />
              </Field>
              <Field>
                <Label htmlFor="currency">Currency</Label>
                <Select value={watchCurrency} onValueChange={(v) => setValue('currency', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['BHD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="startDate">Start date *</Label>
                <DatePickerField id="startDate" aria-invalid={!!errors.startDate} {...register('startDate')} />
              </Field>
              <Field>
                <Label htmlFor="endDate">End date *</Label>
                <DatePickerField id="endDate" aria-invalid={!!errors.endDate} {...register('endDate')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="renewalDate">Renewal date</Label>
                <DatePickerField id="renewalDate" {...register('renewalDate')} />
              </Field>
              <Field>
                <Label htmlFor="renewalAlertDays">Alert before (days)</Label>
                <Input id="renewalAlertDays" type="number" min={0} max={365} {...register('renewalAlertDays')} />
              </Field>
            </div>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" className="resize-none" rows={3} {...register('notes')} />
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions { onSuccess?: (id: string) => void; }

interface ContractFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (contract: { id: string } & Partial<ContractFormValues>, options?: OpenOptions) => void;
}

const ContractFormContext = React.createContext<ContractFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  contract?: { id: string } & Partial<ContractFormValues>;
  onSuccess?: (id: string) => void;
}

export function ContractFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, contract: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback((contract: { id: string } & Partial<ContractFormValues>, options?: OpenOptions) => {
    setState({ open: true, contract, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ContractFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <ContractFormDialog open={state.open} onOpenChange={handleOpenChange} contract={state.contract} onSuccess={state.onSuccess} />
    </ContractFormContext.Provider>
  );
}

export function useContractForm(): ContractFormContextValue {
  const ctx = React.useContext(ContractFormContext);
  if (!ctx) throw new Error('useContractForm must be used inside <ContractFormProvider>');
  return ctx;
}

function defaults(contract?: { id: string } & Partial<ContractFormValues>, orgCurrency?: string): ContractFormValues {
  return {
    title: contract?.title ?? '',
    description: contract?.description ?? undefined,
    status: (contract?.status ?? 'DRAFT') as any,
    contractValue: typeof contract?.contractValue === 'number' ? contract.contractValue : 0,
    currency: (contract?.currency ?? orgCurrency ?? 'BHD') as any,
    startDate: contract?.startDate ?? '',
    endDate: contract?.endDate ?? '',
    renewalDate: contract?.renewalDate ?? undefined,
    renewalAlertDays: typeof contract?.renewalAlertDays === 'number' ? contract.renewalAlertDays : 30,
    notes: contract?.notes ?? undefined,
    customerId: contract?.customerId ?? undefined,
  };
}
