import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { invoicesApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  User,
  Calendar,
  FileText,
  Package,
} from "lucide-react";

function InvoiceItemRow({ item, depth = 0 }: { item: any; depth?: number }) {
  return (
    <>
      <div
        className={`flex items-center justify-between py-2.5 ${depth > 0 ? "pl-6 border-l-2 border-muted ml-4" : ""}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${depth > 0 ? "bg-muted" : "bg-primary/10"}`}
          >
            <Package
              className={`w-3 h-3 ${depth > 0 ? "text-muted-foreground" : "text-primary"}`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {item.description}
            </p>
            {item.code && (
              <p className="text-xs text-muted-foreground font-mono">
                {item.code}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-semibold">
            {formatCurrency(item.salesPrice)}
          </p>
          <p className="text-xs text-muted-foreground">
            cost: {formatCurrency(item.purchasePrice)}
          </p>
        </div>
      </div>
      {item.subItems?.map((sub: any) => (
        <InvoiceItemRow key={sub.id} item={sub} depth={depth + 1} />
      ))}
    </>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    invoicesApi
      .getById(Number(id))
      .then((res) => setInvoice((res as any).data))
      .catch(() => router.push("/invoices"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await invoicesApi.delete(invoice.id);
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const items = invoice?.invoiceItems ?? [];
  const revenue = items.reduce((s: number, i: any) => s + i.salesPrice, 0);
  const cost = items.reduce((s: number, i: any) => s + i.purchasePrice, 0);

  if (loading)
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );

  if (!invoice) return null;

  return (
    <>
      <Head>
        <title>Invoice #{invoice.id} — BizCore</title>
      </Head>
      <AppLayout>
        <PageHeader
          title={`Invoice #${invoice.id}`}
          description={`Created ${formatDate(invoice.date)}`}
          action={
            <div className="flex gap-2">
              <Link href="/invoices">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          }
        />

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Invoice info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(invoice.date)}</span>
                </div>
                {invoice.customer && (
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <Link
                      href={`/customers/${invoice.customer.id}`}
                      className="text-primary hover:underline"
                    >
                      {invoice.customer.name}
                    </Link>
                  </div>
                )}
                {invoice.description && (
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">
                      {invoice.description}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium">{formatCurrency(cost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Gross profit</span>
                  <span
                    className={
                      revenue - cost >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {formatCurrency(revenue - cost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Line items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0 px-5">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  No items on this invoice
                </p>
              ) : (
                items.map((item: any) => (
                  <InvoiceItemRow key={item.id} item={item} />
                ))
              )}
              {items.length > 0 && (
                <div className="flex justify-between py-4 font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(revenue)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this invoice?"
          description="This action cannot be undone."
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      </AppLayout>
    </>
  );
}
