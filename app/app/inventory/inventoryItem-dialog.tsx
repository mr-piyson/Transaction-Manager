'use client';

import * as z from 'zod';
import { type JSX, useState } from 'react';
import { Loader2, Plus, Box, Banknote, FileText, HandCoins, QrCode } from 'lucide-react';
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
import { FieldGroup } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useCreateInventoryItem } from '@/hooks/data/use-inventoryItems';
import { ImageUpload } from './Image-Upload';

import { AppForm, FormInput, FormCustomField, FormGroup } from '@/components/Form';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export const inventoryItemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  code: z.string().min(3, 'SKU must be at least 3 characters'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be a positive number'),
  salesPrice: z.coerce.number().min(0, 'Sale price must be a positive number'),
  description: z.string().optional().or(z.literal('')),
  categoryId: z.number().optional(),
  image: z.instanceof(File).optional(),
});

export type InventoryItemValues = z.infer<typeof inventoryItemSchema>;

// ---------------------------------------------------------------------------
// Default values — must satisfy the full schema shape
// ---------------------------------------------------------------------------
const DEFAULT_VALUES: InventoryItemValues = {
  name: '',
  code: '',
  purchasePrice: 0,
  salesPrice: 0,
  description: '',
  categoryId: undefined,
  image: undefined,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CreateInventoryItemDialogProps {
  onSuccess?: (data: InventoryItemValues) => void;
  onError?: (error: Error) => void;
  children?: JSX.Element;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CreateInventoryItemDialog({
  onSuccess,
  onError,
  children,
}: CreateInventoryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateInventoryItem();

  function handleSubmit(values: InventoryItemValues) {
    createMutation.mutate(
      { ...values, image: undefined },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.(values);
        },
        onError: (error) => {
          toast.error(error.message);
          onError?.(error);
        },
      },
    );
  }

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

        <AppForm
          schema={inventoryItemSchema}
          defaultValues={DEFAULT_VALUES}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {(form) => (
            <>
              {/* ── Image ──────────────────────────────────────────────── */}
              <FormCustomField<File | undefined>
                name="image"
                label="Item Image"
                render={({ value, onChange, isInvalid }) => (
                  <ImageUpload value={value} onChange={onChange} error={isInvalid} />
                )}
              />

              {/* ── Name + Code ────────────────────────────────────────── */}
              <FieldGroup>
                <FormGroup columns={2}>
                  <FormInput
                    name="name"
                    label="Item Name"
                    placeholder="e.g. Aluminum Profile"
                    icon={<Box className="size-4" />}
                  />

                  {/*
                   * CodeGeneratorField manages its own internal state and
                   * writes back via FormCustomField so TanStack Form owns
                   * the value — no RHF Controller needed.
                   */}

                  <FormInput
                    name="code"
                    label="Item Code"
                    placeholder="e.g. ITM-001"
                    icon={<QrCode className="size-4" />}
                  />
                </FormGroup>
              </FieldGroup>

              {/* ── Prices ─────────────────────────────────────────────── */}
              <FieldGroup>
                <FormGroup columns={2}>
                  <FormInput
                    name="purchasePrice"
                    label="Purchase Price"
                    type="number"
                    placeholder="0"
                    icon={<Banknote className="size-4" />}
                  />
                  <FormInput
                    name="salesPrice"
                    label="Sale Price"
                    type="number"
                    placeholder="0.000"
                    icon={<HandCoins className="size-4" />}
                  />
                </FormGroup>
              </FieldGroup>

              {/* ── Description ────────────────────────────────────────── */}
              <FormInput
                name="description"
                label="Description"
                placeholder="Optional details..."
                icon={<FileText className="size-4" />}
                description="Brief details about the item specifications."
              />

              {/* ── Footer ─────────────────────────────────────────────── */}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>

                {/* Subscribe keeps the button reactive to submission state */}
                <form.Subscribe selector={(s: any) => s.isSubmitting}>
                  {(isSubmitting: boolean) => (
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || isSubmitting}
                      className="min-w-[120px]"
                    >
                      {createMutation.isPending || isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Save Item'
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </>
          )}
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
