'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Plus, Warehouse, MapPin } from 'lucide-react';
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
import { AppForm, FormInput } from '@/components/Form';

export const warehouseSchema = z.object({
  name: z.string().min(2, 'Warehouse name is required'),
  address: z.string().optional(),
});

type WarehouseValues = z.infer<typeof warehouseSchema>;

export function CreateWarehouseDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.warehouses.createWarehouse.useMutation();

  async function handleSubmit(values: WarehouseValues) {
    try {
      await createMutation.mutateAsync(values);
      utils.warehouses.getWarehouses.invalidate();
      setOpen(false);
      onSuccess?.();
      toast.success('Warehouse created successfully');
    } catch (error) {
      toast.error('Failed to create warehouse');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" className="gap-2">
            <Plus className="size-4" />
            Add Warehouse
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Warehouse className="size-5" />
            New Storage Location
          </DialogTitle>
          <DialogDescription>
            Add a new warehouse or storage bin to your organization.
          </DialogDescription>
        </DialogHeader>

        <AppForm
          schema={warehouseSchema}
          defaultValues={{ name: '', address: '' }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {(form) => (
            <>
              <FieldGroup>
                <FormInput
                  name="name"
                  label="Warehouse Name"
                  placeholder="e.g. Central Hub"
                  icon={<Warehouse className="size-4" />}
                />
              </FieldGroup>

              <FieldGroup>
                <FormInput
                  name="address"
                  label="Physical Address"
                  placeholder="Street, City, Country"
                  icon={<MapPin className="size-4" />}
                />
              </FieldGroup>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <form.Subscribe selector={(s: any) => s.isSubmitting}>
                  {(isSubmitting: boolean) => (
                    <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                      {isSubmitting || createMutation.isPending ? (
                        <Loader2 className="animate-spin size-4 mr-2" />
                      ) : (
                        'Create Warehouse'
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
