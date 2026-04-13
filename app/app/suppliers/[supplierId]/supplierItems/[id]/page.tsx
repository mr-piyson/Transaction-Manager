'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { z } from 'zod';
import { ChevronLeft, Package, Trash2, Save, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Format } from '@/lib/format';

/* ------------------------------ Validation ------------------------------ */

const UpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().nullable(),
  description: z.string().nullable(),
  basePrice: z.coerce.number().int().nonnegative(),
  image: z.string().url().nullable().or(z.literal('')),
  stockItemId: z.number().optional().nullable(),
});

type UpdateFormData = z.infer<typeof UpdateSchema>;

/* ------------------------------ Main Component ------------------------------ */

export default function InventoryItemClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const utils = trpc.useUtils();
  /* ------------------------------ Queries ------------------------------ */

  const {
    data: item,
    isLoading,
    isError,
  } = trpc.inventory.getInventoryById.useQuery({ id: Number(id) });

  const { data: stockItems } = trpc.items.getItems.useQuery();

  /* ------------------------------ Mutations ------------------------------ */

  const updateMutation = trpc.inventory.updateInventoryItem.useMutation({
    onSuccess: () => {
      utils.inventory.getInventoryById.invalidate({ id: Number(id) });
      toast.success('Item updated successfully');
    },
    onError: () => {
      toast.error('Failed to update item');
    },
  });

  const deleteMutation = trpc.inventory.deleteInventoryItem.useMutation({
    onSuccess: () => {
      router.push('/app/suppliers');
      toast.success('Item deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  /* ------------------------------ Handlers ------------------------------ */

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const rawData = {
      name: formData.get('name'),
      code: formData.get('code') || null,
      description: formData.get('description') || null,
      basePrice: formData.get('basePrice'),
      image: formData.get('image') || null,
      stockItemId: formData.get('stockItemId') ? Number(formData.get('stockItemId')) : null,
    };

    const parsed = UpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      console.error(parsed.error);
      return;
    }

    updateMutation.mutate({
      id: Number(id),
      data: parsed.data as any,
    });
  };

  /* ------------------------------ Loading/Error States ------------------------------ */

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !item) {
    return <div className="p-8 text-center">Item not found or error loading data.</div>;
  }

  return (
    <div className="flex-col md:flex min-h-screen bg-background">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center text-sm text-muted-foreground mb-2">
              <Link
                href="/app/suppliers"
                className="hover:text-primary transition-colors flex items-center"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Supplier
              </Link>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              {item.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: Number(id) })}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Item
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Edit the primary information for this inventory record.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input name="name" id="name" defaultValue={item.name} required />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="code">SKU / Identifier</Label>
                      <Input
                        name="code"
                        id="code"
                        defaultValue={item.code ?? ''}
                        placeholder="e.g. SKU-12345"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">Detailed Description</Label>
                      <Textarea
                        name="description"
                        id="description"
                        defaultValue={item.description ?? ''}
                        placeholder="Add product specifications or notes..."
                        className="min-h-30"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 pt-4">
                    <Label htmlFor="basePrice">Base Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        className="pl-7"
                        name="basePrice"
                        id="basePrice"
                        type="number"
                        defaultValue={formatAmountToDecimal(item.basePrice)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="stockItemId">Link Access to Master Item</Label>
                    <Select name="stockItemId" defaultValue={item.stockItemId?.toString() || ''}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select Master Item..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">None (Not Stocked)</SelectItem>
                        {stockItems?.map((sItem) => (
                          <SelectItem key={sItem.id} value={sItem.id.toString()}>
                            {sItem.name} ({sItem.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 text-left">
                    <Label htmlFor="image">External Image URL</Label>
                    <Input
                      name="image"
                      id="image"
                      defaultValue={item.image ?? ''}
                      placeholder="https://example.com/image.jpg"
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="w-full md:w-auto px-8"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Update Product
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Preview & Stats */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-dashed">
              <CardHeader className="py-3 bg-muted/30">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-0">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full object-cover aspect-square"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 w-full bg-muted/10 text-muted-foreground">
                    <Package className="h-16 w-16 mb-2 opacity-10" />
                    <p className="text-sm italic">No image available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
