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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  contactName: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  crNumber: z.string().optional(),
  notes: z.string().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
});

type FormValues = z.infer<typeof schema>;

function defaults(): FormValues {
  return {
    name: '',
    code: undefined,
    phone: undefined,
    email: undefined,
    contactName: undefined,
    website: undefined,
    taxId: undefined,
    crNumber: undefined,
    notes: undefined,
    paymentTermsDays: 30,
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

export default function NewSupplierPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(),
  });

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess(data) {
      utils.suppliers.list.invalidate();
      toast.success('Supplier created', { description: data.name });
      router.push('/app/suppliers');
    },
    onError(err) {
      toast.error('Failed to create supplier', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    createMutation.mutate(values);
  };

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
              <Link href="/app/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
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
                    Company Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field>
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="name" placeholder="Supplier name" aria-invalid={!!errors.name} {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="code">Supplier Code</Label>
                      <Input id="code" placeholder="SUP-001" {...register('code')} />
                    </Field>
                    <Field>
                      <Label htmlFor="paymentTermsDays">
                        Payment Terms <span className="text-muted-foreground font-normal">(days)</span>
                      </Label>
                      <Input id="paymentTermsDays" type="number" min={0} max={365} {...register('paymentTermsDays')} />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="+973 1234 5678" {...register('phone')} />
                    </Field>
                    <Field>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="supplier@example.com" {...register('email')} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="contactName">Contact Person</Label>
                      <Input id="contactName" placeholder="John Doe" {...register('contactName')} />
                    </Field>
                    <Field>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="https://example.com" {...register('website')} />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Registration & Tax
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input id="taxId" placeholder="VAT-000001" {...register('taxId')} />
                    </Field>
                    <Field>
                      <Label htmlFor="crNumber">CR Number</Label>
                      <Input id="crNumber" placeholder="CR-000001" {...register('crNumber')} />
                      <p className="text-xs text-muted-foreground mt-1">Commercial Registration number</p>
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
                    <Textarea id="notes" placeholder="Internal notes..." className="resize-none" rows={3} {...register('notes')} />
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
                Create Supplier
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
