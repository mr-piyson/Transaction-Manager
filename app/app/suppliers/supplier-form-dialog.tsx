'use client';

import { JSX, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Phone, Pencil, Building2, Mail, Globe, Hash, FileText, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

import * as z from 'zod';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  contactName: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

// Shape of an existing supplier passed in for editing
export interface SupplierData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contactName?: string | null;
  website?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isSystem?: boolean;
}

interface SupplierFormDialogProps {
  /** When provided the dialog operates in edit mode; omit for create mode. */
  supplier?: SupplierData;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  /** Custom trigger element. Defaults to a contextual Add / Edit button. */
  children?: JSX.Element;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  className?: string;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupplierFormDialog({
  supplier,
  onSuccess,
  onError,
  children,
  variant,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SupplierFormDialogProps) {
  const isEditMode = Boolean(supplier);

  // Support both controlled and uncontrolled open state
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    controlledOnOpenChange?.(value);
    setInternalOpen(value);
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.suppliers.create.useMutation();
  const updateMutation = trpc.suppliers.update.useMutation();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      contactName: supplier?.contactName ?? '',
      website: supplier?.website ?? '',
      taxId: supplier?.taxId ?? '',
      notes: supplier?.notes ?? '',
    },
  });

  // Keep form values in sync when the supplier prop changes
  useEffect(() => {
    reset({
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      contactName: supplier?.contactName ?? '',
      website: supplier?.website ?? '',
      taxId: supplier?.taxId ?? '',
      notes: supplier?.notes ?? '',
    });
  }, [supplier, reset]);

  const invalidateQueries = () => {
    utils.suppliers.list.invalidate();
    utils.suppliers.getById.invalidate();
  };

  const onSubmit = async (values: SupplierFormValues) => {
    if (isEditMode && supplier) {
      if (supplier.isSystem) {
        toast.error('Cannot modify the system supplier');
        return;
      }
      
      // ── UPDATE ──────────────────────────────────────────────────────────
      updateMutation.mutate(
        {
          id: supplier.id,
          ...values,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            setOpen(false);
            toast.success('Supplier updated successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to update supplier');
            onError?.(err);
          },
        },
      );
    } else {
      // ── CREATE ──────────────────────────────────────────────────────────
      createMutation.mutate(
        {
          ...values,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            reset();
            setOpen(false);
            toast.success('Supplier created successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to create supplier');
            onError?.(err);
          },
        },
      );
    }
  };

  const defaultTrigger = isEditMode ? (
    <Button size="sm" variant={variant ?? 'ghost'} className={className} disabled={supplier?.isSystem}>
      <Pencil className="size-4 mr-2" />
      Edit
    </Button>
  ) : (
    <Button size="sm" variant={variant} className={className}>
      <Plus className="size-4 mr-2" />
      New Supplier
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children ?? defaultTrigger} />

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <Building2 />
            <span>{isEditMode ? 'Edit Supplier' : 'New Supplier'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the supplier details below.'
              : 'Enter the details to create a new supplier record.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <Field data-invalid={!!errors.name} className="col-span-full">
              <FieldLabel>Company Name <span className="text-destructive">*</span></FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('name')} placeholder="Company Name" />
                <InputGroupAddon>
                  <Building2 className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            {/* Contact Name */}
            <Field data-invalid={!!errors.contactName}>
              <FieldLabel>Contact Person</FieldLabel>
              <Input {...register('contactName')} placeholder="e.g. John Doe" />
              <FieldError>{errors.contactName?.message}</FieldError>
            </Field>

            {/* Phone */}
            <Field data-invalid={!!errors.phone}>
              <FieldLabel>Phone Number</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('phone')} placeholder="+973 ..." />
                <InputGroupAddon>
                  <Phone className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.phone?.message}</FieldError>
            </Field>

            {/* Email */}
            <Field data-invalid={!!errors.email}>
              <FieldLabel>Email</FieldLabel>
              <InputGroup>
                <InputGroupInput type="email" {...register('email')} placeholder="hello@company.com" />
                <InputGroupAddon>
                  <Mail className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            {/* Website */}
            <Field data-invalid={!!errors.website}>
              <FieldLabel>Website</FieldLabel>
              <InputGroup>
                <InputGroupInput type="url" {...register('website')} placeholder="https://..." />
                <InputGroupAddon>
                  <Globe className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.website?.message}</FieldError>
            </Field>

            {/* Tax ID */}
            <Field data-invalid={!!errors.taxId} className="col-span-full sm:col-span-1">
              <FieldLabel>Tax ID</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('taxId')} placeholder="VAT Number" />
                <InputGroupAddon>
                  <Hash className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.taxId?.message}</FieldError>
            </Field>

            {/* Address */}
            <Field data-invalid={!!errors.address} className="col-span-full">
              <FieldLabel>Address</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('address')} placeholder="123 Business Road..." />
                <InputGroupAddon>
                  <MapPin className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.address?.message}</FieldError>
            </Field>

            {/* Notes */}
            <Field data-invalid={!!errors.notes} className="col-span-full">
              <FieldLabel>Notes</FieldLabel>
              <Textarea {...register('notes')} placeholder="Additional info..." className="resize-none h-20" />
              <FieldError>{errors.notes?.message}</FieldError>
            </Field>
          </FieldGroup>

          {/* Footer */}
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-30">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Save Supplier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
