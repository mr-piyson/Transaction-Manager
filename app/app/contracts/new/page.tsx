'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Header } from '@/app/app/App-Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/use-currency';
import { trpc } from '@/lib/trpc/client';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  contractValue: z.coerce.number().min(0),
  currency: z.enum(['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  renewalDate: z.string().optional(),
  renewalAlertDays: z.coerce.number().int().min(0).max(365),
  notes: z.string().optional(),
  customerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function defaults(currency: string): FormValues {
  return {
    title: '',
    description: undefined,
    contractValue: 0,
    currency: currency as FormValues['currency'],
    startDate: '',
    endDate: '',
    renewalDate: undefined,
    renewalAlertDays: 30,
    notes: undefined,
    customerId: undefined,
  };
}

function ValidationAlert({ errors }: { errors: Partial<Record<keyof FormValues, { message?: string }>> }) {
  const messages = Object.values(errors).map((e) => e?.message).filter(Boolean) as string[];
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{messages.length} field{messages.length > 1 ? 's' : ''} need attention</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default function NewContractPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: customersData, isLoading: customersLoading } = trpc.customers.list.useQuery({ limit: 200 });
  const { currency } = useCurrency();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(currency),
  });

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess(data) {
      utils.contracts.list.invalidate();
      toast.success('Contract created', { description: data.title });
      router.push('/app/contracts');
    },
    onError(err) {
      toast.error('Failed to create contract', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const payload = {
      ...values,
      startDate: new Date(values.startDate),
      endDate: new Date(values.endDate),
      renewalDate: values.renewalDate ? new Date(values.renewalDate) : undefined,
    };
    createMutation.mutate(payload);
  };

  const customers = Array.isArray(customersData) ? customersData : customersData?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header
        leftContent={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/app/contracts" className="hover:text-foreground transition-colors">Contracts</Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">New</span>
            </nav>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl p-4 md:p-8 space-y-6">
          {hasErrors && <ValidationAlert errors={errors as any} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Contract Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field>
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input id="title" placeholder="Annual Maintenance Contract" aria-invalid={!!errors.title} {...register('title')} />
                    {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
                  </Field>

                  <Field>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" className="resize-none" rows={2} {...register('description')} />
                  </Field>

                  <Field>
                    <Label htmlFor="customerId">Customer</Label>
                    <Select onValueChange={(v) => setValue('customerId', v)} disabled={customersLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={customersLoading ? 'Loading...' : 'Select customer'} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Financial Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="contractValue">Contract Value</Label>
                      <Input id="contractValue" type="number" min={0} step="0.001" {...register('contractValue')} />
                    </Field>
                    <Field>
                      <Label htmlFor="currency">Currency</Label>
                      <Select defaultValue="BHD" onValueChange={(v) => setValue('currency', v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['BHD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Duration & Renewal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="startDate">
                        Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
                      {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
                    </Field>
                    <Field>
                      <Label htmlFor="endDate">
                        End Date <span className="text-destructive">*</span>
                      </Label>
                      <Input id="endDate" type="date" aria-invalid={!!errors.endDate} {...register('endDate')} />
                      {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="renewalDate">Renewal Date</Label>
                      <Input id="renewalDate" type="date" {...register('renewalDate')} />
                      <p className="text-xs text-muted-foreground mt-1">When the contract renews automatically</p>
                    </Field>
                    <Field>
                      <Label htmlFor="renewalAlertDays">Alert Before (days)</Label>
                      <Input id="renewalAlertDays" type="number" min={0} max={365} {...register('renewalAlertDays')} />
                      <p className="text-xs text-muted-foreground mt-1">Days before renewal to send a notification</p>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <Label htmlFor="notes">Internal Notes</Label>
                    <Textarea id="notes" className="resize-none" rows={3} {...register('notes')} />
                  </Field>
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-0 mt-6 -mx-4 md:-mx-8 p-4 md:p-6 bg-background/95 backdrop-blur-md border-t flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-32">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Contract
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
