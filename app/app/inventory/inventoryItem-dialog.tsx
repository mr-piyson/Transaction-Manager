'use client';
import * as z from 'zod';

export const inventoryItemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  code: z.string().min(3, 'SKU must be at least 3 characters'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be a positive number'),
  salesPrice: z.coerce.number().min(0, 'Sale price must be a positive number'),
  description: z.string().optional().or(z.literal('')),
  categoryId: z.number().optional(),
  image: z.file().optional(),
});

export type InventoryItemValues = z.infer<typeof inventoryItemSchema>;

import React, { JSX, useState } from 'react';
import { Controller, useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Box, Hash, BarChart3, Banknote, FileText, HandCoins } from 'lucide-react';

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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useCreateInventoryItem } from '@/hooks/data/use-inventoryItems';
import { ImageUpload } from './Image-Upload';
import { toast } from 'sonner';
import { CodeGeneratorField } from './code-generator';

interface CreateInventoryItemDialogProps {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
}

export function CreateInventoryItemDialog({
  onSuccess,
  onError,
  children,
}: CreateInventoryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateInventoryItem();

  const methods = useForm<InventoryItemValues>({
    defaultValues: {
      name: '',
      code: '',
      purchasePrice: undefined,
      salesPrice: undefined,
      description: '',
      image: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = methods;

  const onInvalid = (errors: any) => {
    console.log('Validation errors:', errors);
  };

  const onSubmit = async (values: InventoryItemValues) => {
    createMutation.mutate(
      {
        ...values,
        image: values.image as undefined,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
          onSuccess?.(values);
        },
        onError: (error) => {
          toast.error(error.message);
          onError?.(error);
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
              Add Item
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <Box />
            <span>New Inventory Item</span>
          </DialogTitle>
          <DialogDescription>Enter the details to add a new item to your stock.</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Image Upload Field */}
            <Field data-invalid={!!errors.image}>
              <FieldLabel>Item Image</FieldLabel>
              <Controller
                control={control}
                name="image"
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.image}
                  />
                )}
              />
              <FieldError>{errors.image?.message}</FieldError>
            </Field>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name Field */}
              <Field data-invalid={!!errors.name}>
                <FieldLabel>Item Name</FieldLabel>
                <InputGroup>
                  <InputGroupInput {...register('name')} placeholder="e.g. Aluminum Profile" />
                  <InputGroupAddon>
                    <Box className="size-4" />
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              {/* Code Field */}
              <CodeGeneratorField name="code" label="Item Code" prefix="ITM" />
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Quantity Field */}
              <Field data-invalid={!!errors.purchasePrice}>
                <FieldLabel>Purchase Price</FieldLabel>
                <InputGroup>
                  <InputGroupInput {...register('purchasePrice')} type="number" placeholder="0" />
                  <InputGroupAddon>
                    <Banknote className="size-4" />
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{errors.purchasePrice?.message}</FieldError>
              </Field>

              {/* Price Field */}
              <Field data-invalid={!!errors.salesPrice}>
                <FieldLabel>Sale Price</FieldLabel>
                <InputGroup>
                  <InputGroupInput {...register('salesPrice')} type="number" placeholder="0.000" />
                  <InputGroupAddon>
                    <HandCoins className="size-4" />
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{errors.salesPrice?.message}</FieldError>
              </Field>
            </FieldGroup>

            {/* Description Field */}
            <Field data-invalid={!!errors.description}>
              <FieldLabel>Description</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('description')} placeholder="Optional details..." />
                <InputGroupAddon>
                  <FileText className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>Brief details about the item specifications.</FieldDescription>
              <FieldError>{errors.description?.message}</FieldError>
            </Field>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="min-w-[120px]">
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Save Item'
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
