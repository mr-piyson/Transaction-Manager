'use client';

import * as z from 'zod';
import { type JSX, useState } from 'react';
import { Loader2, Plus, Store, Phone, MapPin, Mail, User, Globe, Tag, FileText } from 'lucide-react';
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
import { trpc } from '@/lib/trpc/client';
import { AppForm, FormInput, FormGroup } from '@/components/Form';

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(3, 'Phone number is required'),
  address: z.string().min(3, 'Address is required'),
  email: z.string().email().optional().or(z.literal('')),
  contactName: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type SupplierValues = z.infer<typeof supplierSchema>;

const DEFAULT_VALUES: SupplierValues = {
  name: '',
  phone: '',
  address: '',
  email: '',
  contactName: '',
  website: '',
  taxId: '',
  notes: '',
};

interface CreateSupplierDialogProps {
  onSuccess?: () => void;
  children?: JSX.Element;
}

export function CreateSupplierDialog({ onSuccess, children }: CreateSupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.suppliers.createSupplier.useMutation({
    onSuccess: () => {
      utils.suppliers.getSuppliers.invalidate();
      setOpen(false);
      toast.success('Supplier created successfully');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create supplier');
    },
  });

  async function handleSubmit(values: SupplierValues) {
    createMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="default" className="gap-2">
              <Plus className="size-4" />
              Add Supplier
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <Store />
            <span>New Supplier</span>
          </DialogTitle>
          <DialogDescription>Register a new supplier to manage their items and purchases.</DialogDescription>
        </DialogHeader>

        <AppForm
          schema={supplierSchema}
          defaultValues={DEFAULT_VALUES}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {(form) => (
            <>
              <FieldGroup>
                <FormInput
                  name="name"
                  label="Supplier Name"
                  placeholder="e.g. Al-Noor Supplies"
                  icon={<Store className="size-4" />}
                />
              </FieldGroup>

              <FormGroup columns={2}>
                <FormInput
                  name="phone"
                  label="Phone"
                  placeholder="+973 ..."
                  icon={<Phone className="size-4" />}
                />
                <FormInput
                  name="email"
                  label="Email"
                  placeholder="contact@supplier.com"
                  icon={<Mail className="size-4" />}
                />
              </FormGroup>

              <FieldGroup>
                <FormInput
                  name="address"
                  label="Address"
                  placeholder="Building, Road, Area..."
                  icon={<MapPin className="size-4" />}
                />
              </FieldGroup>

              <FormGroup columns={2}>
                <FormInput
                  name="contactName"
                  label="Contact person"
                  placeholder="John Doe"
                  icon={<User className="size-4" />}
                />
                <FormInput
                  name="taxId"
                  label="Tax / VAT ID"
                  placeholder="Optional"
                  icon={<Tag className="size-4" />}
                />
              </FormGroup>

              <FieldGroup>
                <FormInput
                  name="website"
                  label="Website"
                  placeholder="https://..."
                  icon={<Globe className="size-4" />}
                />
              </FieldGroup>

              <FieldGroup>
                <FormInput
                  name="notes"
                  label="Notes"
                  placeholder="Payment terms, delivery patterns..."
                  icon={<FileText className="size-4" />}
                />
              </FieldGroup>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <form.Subscribe selector={(s: any) => s.isSubmitting}>
                  {(isSubmitting: boolean) => (
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || isSubmitting}
                      className="min-w-30"
                    >
                      {createMutation.isPending || isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Save Supplier'
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
