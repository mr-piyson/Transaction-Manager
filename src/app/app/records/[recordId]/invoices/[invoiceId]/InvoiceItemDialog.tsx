"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/app/app/App";

/**
 * Zod Schema for Validation
 * Handles number coercion automatically so inputs work safely
 */
const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().min(1, "Qty must be at least 1"),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  discount: z.coerce.number().optional().default(0),
  tax: z.coerce.number().optional().default(0),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface InvoiceItemDialogProps {
  children?: React.ReactNode;
  recordId: string;
  invoiceId: string;
  initialData?: any; // Pass the item object here if editing
}

export default function InvoiceItemDialog({ children, recordId, invoiceId, initialData }: InvoiceItemDialogProps) {
  const [open, setOpen] = React.useState(false);
  const isEditing = !!initialData;

  // 1. Setup Form with Zod Resolver
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      description: initialData?.description || "",
      qty: initialData?.qty || 1,
      amount: initialData?.amount || 0,
      discount: initialData?.discount || 0,
      tax: initialData?.tax || 0,
    },
  });

  // 2. Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset({
        description: initialData?.description || "",
        qty: initialData?.qty || 1,
        amount: initialData?.amount || 0,
        discount: initialData?.discount || 0,
        tax: initialData?.tax || 0,
      });
    }
  }, [open, initialData, form]);

  // 3. Live Total Calculation (Visual Feedback)
  const watchedValues = useWatch({ control: form.control });
  const liveTotal = React.useMemo(() => {
    const q = Number(watchedValues.qty) || 0;
    const a = Number(watchedValues.amount) || 0;
    const d = Number(watchedValues.discount) || 0;
    const t = Number(watchedValues.tax) || 0;
    return q * a - d + t;
  }, [watchedValues]);

  // 4. Handle Submit
  const onSubmit = async (values: ItemFormValues) => {
    try {
      // Determine URL and Method
      const baseUrl = `/api/records/${recordId}/invoices/${invoiceId}`;
      const url = isEditing ? `${baseUrl}/items/${initialData.id}` : baseUrl; // Adjust if your POST/PUT routes differ
      const method = isEditing ? "put" : "post";

      // Axios Call
      await axios[method](url, {
        ...values,
        currency: "BD", // Default currency
      });

      // Feedback
      toast.success(isEditing ? "Item Updated" : "Item Added", {
        description: isEditing ? "Invoice line item updated successfully" : "New line item added to invoice",
      });

      // Invalidate Queries
      queryClient.invalidateQueries({ queryKey: ["invoices", recordId] });
      queryClient.invalidateQueries({ queryKey: ["invoiceItems"] });

      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save item",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children || <Button>{isEditing ? "Edit Item" : "Add Item"}</Button>}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Invoice Item" : "Add Invoice Item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Item or service description" {...form.register("description")} />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          {/* Quantity & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" min="1" {...form.register("qty")} />
              {form.formState.errors.qty && <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Unit Price (BD)</Label>
              <Input id="amount" type="number" step="0.001" {...form.register("amount")} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (Optional)</Label>
              <Input id="discount" type="number" step="0.001" {...form.register("discount")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax (Optional)</Label>
              <Input id="tax" type="number" step="0.001" {...form.register("tax")} />
            </div>
          </div>

          {/* Live Summary */}
          <div className="rounded-md bg-muted p-3 flex items-center justify-between border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calculator className="h-4 w-4" />
              <span>Total</span>
            </div>
            <div className="text-lg font-bold">{liveTotal.toFixed(3)} BD</div>
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Close
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
