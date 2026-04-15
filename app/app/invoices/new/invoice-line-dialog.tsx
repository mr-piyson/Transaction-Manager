'use client';

import { JSX, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, User, Phone, MapPin, Box } from 'lucide-react';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import z from 'zod';

interface CreateCustomerDialogProps {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
}

export function CreateInvoiceLineDialog({
  onSuccess,
  onError,
  children,
}: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({});

  const onSubmit = async (values: Prisma.InvoiceLineCreateInput) => {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button className="gap-2">
              <Box className="size-4" />
              Add Invoice Line
            </Button>
          )
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className=" flex flex-row gap-2 text-primary text-2xl items-center">
            <User />
            <span>New Invoice Line</span>
          </DialogTitle>
          <DialogDescription>Enter the details to create a new invoice line.</DialogDescription>
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
            {/* <CityCombobox /> */}
            <InputGroup>
              <InputGroupInput {...register('address')} placeholder="Address ..." />
              <InputGroupAddon>
                <MapPin />
              </InputGroupAddon>
            </InputGroup>
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
