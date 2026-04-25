'use client';

import { JSX, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, User, Phone, Pencil } from 'lucide-react';
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
import { CityCombobox } from '@/components/cities/combobox-cities';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  address: z.string().min(3, 'Address is required'),
  email: z.email('Invalid email').optional().or(z.literal('')),
  countryId: z.number().optional(),
  cityId: z.number().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

// Shape of an existing customer passed in for editing
export interface CustomerData {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
}

interface CustomerFormDialogProps {
  /** When provided the dialog operates in edit mode; omit for create mode. */
  customer?: CustomerData;
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

export function CustomerFormDialog({
  customer,
  onSuccess,
  onError,
  children,
  variant,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CustomerFormDialogProps) {
  const isEditMode = Boolean(customer);

  // Support both controlled and uncontrolled open state
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    controlledOnOpenChange?.(value);
    setInternalOpen(value);
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.customers.create.useMutation();
  const updateMutation = trpc.customers.update.useMutation();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      email: customer?.email ?? '',
    },
  });

  // Keep form values in sync when the customer prop changes
  useEffect(() => {
    reset({
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      email: customer?.email ?? '',
    });
  }, [customer, reset]);

  const invalidateQueries = () => {
    utils.customers.list.invalidate();
    utils.customers.getById.invalidate();
  };

  const onSubmit = async (values: CustomerFormValues) => {
    if (isEditMode && customer) {
      // ── UPDATE ──────────────────────────────────────────────────────────
      updateMutation.mutate(
        {
          id: customer.id,
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            setOpen(false);
            toast.success('Customer updated successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error('Failed to update customer');
            onError?.(err);
          },
        },
      );
    } else {
      // ── CREATE ──────────────────────────────────────────────────────────
      createMutation.mutate(
        {
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            reset();
            setOpen(false);
            toast.success('Customer created successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error('Failed to create customer');
            onError?.(err);
          },
        },
      );
    }
  };

  const defaultTrigger = isEditMode ? (
    <Button size="sm" variant={variant ?? 'ghost'} className={className}>
      <Pencil className="size-4" />
      Edit Customer
    </Button>
  ) : (
    <Button size="sm" variant={variant} className={className}>
      <Plus className="size-4" />
      Add Customer
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children ?? defaultTrigger} />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <User />
            <span>{isEditMode ? 'Edit Customer' : 'New Customer'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the customer details below.'
              : 'Enter the details to create a new customer record.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <Field data-invalid={!!errors.name}>
              <FieldLabel>Full Name</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('name')} placeholder="Name ..." />
                <InputGroupAddon>
                  <User />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            {/* Phone */}
            <Field data-invalid={!!errors.phone}>
              <FieldLabel>Phone Number</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('phone')} placeholder="+973 ..." />
                <InputGroupAddon>
                  <Phone />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.phone?.message}</FieldError>
            </Field>
          </FieldGroup>

          {/* Address */}
          <Field data-invalid={!!errors.address}>
            <FieldLabel>Address</FieldLabel>
            <Controller
              control={control}
              name="address"
              render={({ field }) => <CityCombobox onSelect={(city) => field.onChange(city.en)} />}
            />
            <FieldError>{errors.address?.message}</FieldError>
          </Field>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-30">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Save Customer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
