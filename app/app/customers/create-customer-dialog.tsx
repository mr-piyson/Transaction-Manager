'use client';

import { JSX, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, User, Phone, MapPin } from 'lucide-react';
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

interface CreateCustomerDialogProps {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  className?: string;
}

export function CreateCustomerDialog({
  onSuccess,
  onError,
  children,
  variant,
  className,
}: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.customers.createCustomer.useMutation();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', address: '', email: '' },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    createMutation.mutate(
      {
        name: values.name,
        address: values.address,
        phone: values.phone,
        email: values.email || null,
      },
      {
        onSuccess: (data) => {
          utils.customers.getCustomers.invalidate();
          reset();
          setOpen(false);
          onSuccess?.(data);
        },
        onError: (err) => {
          toast.error('Failed to create customer');
          onError?.(err);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button size={'sm'} variant={variant} className={className}>
              <Plus className="size-4" />
              Add Customer
            </Button>
          )
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className=" flex flex-row gap-2 text-primary text-2xl items-center">
            <User />
            <span>New Customer</span>
          </DialogTitle>
          <DialogDescription>Enter the details to create a new customer record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name Field */}
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

            {/* Phone Field */}
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
          {/* Address Field */}
          <Field data-invalid={!!errors.address}>
            <FieldLabel>Address</FieldLabel>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <CityCombobox
                  // field.value would be the current string
                  onSelect={(city) => field.onChange(city.en)}
                />
              )}
            />
            <FieldError>{errors.address?.message}</FieldError>
          </Field>

          {/* Dialog Footer */}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="min-w-30">
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
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
