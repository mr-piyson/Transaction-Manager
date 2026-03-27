'use client';

import React, { JSX, ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, User, Phone, MapPin, Mail, SearchIcon } from 'lucide-react';
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useCreateCustomer, useCustomers } from '@/hooks/data/use-customers';

import * as z from 'zod';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  address: z.string().min(5, 'Address is required'),
  email: z.email('Invalid email').optional().or(z.literal('')),
  countryId: z.number().optional(),
  cityId: z.number().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface CreateCustomerDialogProps {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
}

export function CreateCustomerDialog({ onSuccess, onError, children }: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
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
        cityId: 0,
        countryId: 0,
        email: '',
        organizationId: 0,
      },
      {
        onSuccess: (data) => {
          toast.success('Customer created successfully');
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
            <Button variant="default" className="gap-2">
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
          {/* Email Field */}
          <Field data-invalid={!!errors.email}>
            <FieldLabel>Email Address</FieldLabel>
            <InputGroup>
              <InputGroupInput {...register('email')} type="email" placeholder="(optional)" />
              <InputGroupAddon>
                <Mail />
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>Optional: Used for sending invoices.</FieldDescription>
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          {/* Address Field */}
          {/* <Field data-invalid={!!errors.address}>
            <FieldLabel>Address</FieldLabel>
            <CityCombobox />
          </Field> */}
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
