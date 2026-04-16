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

interface InvoiceLineDialogProps {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
}

export function CreateInvoiceLineDialog({ onSuccess, onError, children }: InvoiceLineDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        description: z.string(),
        quantity: z.coerce.string(),
        purchasePrice: z.coerce.bigint(),
        unitPrice: z.coerce.bigint(),
        discountAmt: z.coerce.bigint(),
      }),
    ),
    defaultValues: {
      description: '',
      quantity: '',
      purchasePrice: BigInt(0),
      unitPrice: BigInt(0),
      discountAmt: BigInt(0),
    },
  });

  const onSubmit = async (values: any) => {};

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"></form>
      </DialogContent>
    </Dialog>
  );
}
