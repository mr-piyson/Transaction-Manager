import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { invoicesApi, customersApi, inventoryApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Package } from "lucide-react";

interface LineItem {
  id: string;
  code: string;
  description: string;
  purchasePrice: number;
  salesPrice: number;
  total: number;
  inventoryItemId?: number;
}

const emptyItem = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  code: "",
  description: "",
  purchasePrice: 0,
  salesPrice: 0,
  total: 0,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      customersApi.list({ limit: "200" }),
      inventoryApi.list({ limit: "200" }),
    ]).then(([c, i]) => {
      setCustomers(c.customers);
      setInventoryItems(i.items);
    });
  }, []);

  const updateItem = (id: string, key: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [key]: value };
        if (key === "salesPrice") updated.total = Number(value);
        return updated;
      }),
    );
  };

  const selectInventoryItem = (lineId: string, invId: string) => {
    const inv = inventoryItems.find((i) => String(i.id) === invId);
    if (!inv) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              inventoryItemId: inv.id,
              code: inv.code || "",
              description: inv.description,
              purchasePrice: inv.purchasePrice,
              salesPrice: inv.salesPrice,
              total: inv.salesPrice,
            }
          : item,
      ),
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const subtotal = items.reduce((s, i) => s + i.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        customerId: customerId ? Number(customerId) : undefined,
        description: description || undefined,
        date: new Date(date).toISOString(),
        items: items.map(({ id, ...rest }) => rest),
      };
      const res = (await invoicesApi.create(payload)) as any;
      toast.success("Invoice created!");
      router.push(`/invoices/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>New Invoice — BizCore</title>
      </Head>
      <AppLayout>
        <PageHeader
          title="New Invoice"
          description="Create a new invoice for a customer"
          action={
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
          }
        />
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Header details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional invoice notes…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Line items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Header row */}
                <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  <span className="col-span-4">Description</span>
                  <span className="col-span-3">From inventory</span>
                  <span className="col-span-2">Cost</span>
                  <span className="col-span-2">Price</span>
                  <span className="col-span-1"></span>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-start animate-in-fade"
                  >
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Input
                        placeholder={`Item ${idx + 1} description`}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        required
                        className="text-sm"
                      />
                      {item.code && (
                        <p className="text-xs text-muted-foreground font-mono px-1">
                          {item.code}
                        </p>
                      )}
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Select
                        onValueChange={(v) => selectInventoryItem(item.id, v)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Pick from inventory…" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((inv) => (
                            <SelectItem key={inv.id} value={String(inv.id)}>
                              <div className="flex items-center gap-2">
                                <Package className="w-3 h-3" />
                                {inv.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.purchasePrice || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "purchasePrice",
                            Number(e.target.value),
                          )
                        }
                        className="text-sm font-mono"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.salesPrice || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "salesPrice",
                            Number(e.target.value),
                          )
                        }
                        className="text-sm font-mono"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-end">
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(subtotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Link href="/invoices">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create invoice
              </Button>
            </div>
          </div>
        </form>
      </AppLayout>
    </>
  );
}
