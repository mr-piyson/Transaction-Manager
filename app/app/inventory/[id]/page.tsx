'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { ChevronLeft, Package, Trash2, Save, TrendingUp, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/data/use-inventoryItems';

/* ------------------------------ Validation ------------------------------ */

const UpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().nullable(),
  description: z.string().nullable(),
  purchasePrice: z.coerce.number().int().nonnegative(),
  salesPrice: z.coerce.number().int().nonnegative(),
  image: z.string().url().nullable().or(z.literal('')),
});

type UpdateFormData = z.infer<typeof UpdateSchema>;

/* ------------------------------ Main Component ------------------------------ */

export default function InventoryItemClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  /* ------------------------------ Queries ------------------------------ */

  const { data, isLoading, isError } = useInventoryItems().getAll;
  const item = data as any;

  /* ------------------------------ Mutations ------------------------------ */

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateFormData) => {
      console.log(payload);
      return axios.patch(`/api/inventory/${id}`, payload);
    },
    onSuccess: () => {
      toast.success('Item updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axios.delete(`/api/inventory/${id}`);
    },
    onSuccess: () => {
      router.push('/app/inventory');
      router.refresh();
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
      purchasePrice: formData.get('purchasePrice'),
      salesPrice: formData.get('salesPrice'),
      image: formData.get('image') || null,
    };

    const parsed = UpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      console.error(parsed.error);
      return;
    }

    updateMutation.mutate(parsed.data);
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

  const profit = item.salesPrice - item.purchasePrice;
  const margin = item.salesPrice > 0 ? ((profit / item.salesPrice) * 100).toFixed(1) : '0';

  return (
    <div className="flex-col md:flex min-h-screen bg-background">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center text-sm text-muted-foreground mb-2">
              <Link
                href="/app/inventory"
                className="hover:text-primary transition-colors flex items-center"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Inventory
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
              onClick={() => deleteMutation.mutate()}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="purchasePrice">Cost (Purchase Price)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          className="pl-7"
                          name="purchasePrice"
                          id="purchasePrice"
                          type="number"
                          defaultValue={item.purchasePrice}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="salesPrice">Retail (Sales Price)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          className="pl-7"
                          name="salesPrice"
                          id="salesPrice"
                          type="number"
                          defaultValue={item.salesPrice}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="image">External Image URL</Label>
                    <Input
                      name="image"
                      id="image"
                      defaultValue={item.image ?? ''}
                      placeholder="https://example.com/image.jpg"
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold">${profit.toLocaleString()}</p>
                  </div>
                  <Badge
                    className={
                      profit >= 0
                        ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15'
                        : ''
                    }
                  >
                    {profit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : null}
                    {margin}% Margin
                  </Badge>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Cost:</span>
                    <span className="font-medium">${item.purchasePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Revenue:</span>
                    <span className="font-medium">${item.salesPrice}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
