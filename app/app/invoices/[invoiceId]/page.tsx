'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Money } from '@/lib/money';
import { useRouter, useParams } from 'next/navigation';
import {
  Trash2,
  Loader2,
  User,
  Calendar,
  FileText,
  Package,
  File,
  PenBoxIcon,
  Check,
  Receipt,
} from 'lucide-react';

type InvoiceItem = {
  id: number;
  description: string;
  code?: string;
  salesPrice: number;
  purchasePrice: number;
  subItems?: InvoiceItem[];
};

type Invoice = {
  id: number;
  date: string;
  description?: string;
  customer?: { id: number; name: string };
  invoiceItems: InvoiceItem[];
};

function InvoiceItemRow({
  item,
  depth = 0,
}: {
  item: InvoiceItem;
  depth?: number;
}) {
  return (
    <>
      <div
        className={`flex items-center justify-between py-3 px-4 transition-colors hover:bg-muted/50 ${depth > 0 ? 'pl-10 border-l-2 border-muted/50 ml-4' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${depth > 0 ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
          >
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-none mb-1">
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
            {Money.format(item.salesPrice)}
          </p>
          <p className="text-xs text-muted-foreground">
            Cost: {Money.format(item.purchasePrice)}
          </p>
        </div>
      </div>

      {item.subItems?.map((sub) => (
        <InvoiceItemRow key={sub.id} item={sub} depth={depth + 1} />
      ))}
    </>
  );
}

/* ---------- helpers ---------- */

function sumTree(
  items: InvoiceItem[],
  selector: (i: InvoiceItem) => number,
): number {
  let total = 0;
  for (const i of items) {
    total += selector(i);
    if (i.subItems?.length) total += sumTree(i.subItems, selector);
  }
  return total;
}

/* ---------- page ---------- */

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);

  // Mock data setup
  const [invoice, setInvoice] = useState<Invoice | null>({
    id: 1,
    date: new Date().toDateString(),
    invoiceItems: [
      {
        id: 1,
        description: 'Website Redesign Project',
        salesPrice: 0,
        purchasePrice: 0,
        code: 'PRJ-001',
        subItems: [
          {
            id: 3,
            description: 'Frontend Development',
            salesPrice: 1500,
            purchasePrice: 800,
            code: 'DEV-FE',
          },
          {
            id: 5,
            description: 'UI/UX Design',
            salesPrice: 800,
            purchasePrice: 400,
            code: 'DSN-UI',
          },
        ],
      },
      {
        id: 2,
        description: 'Hosting Setup (1 Year)',
        salesPrice: 200,
        purchasePrice: 120,
        code: 'SRV-HST',
      },
    ],
    customer: { id: 1, name: 'Muntadher' },
    description:
      'Initial deposit for the upcoming e-commerce website redesign.',
  });

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        // const res = await invoicesApi.getById(id);
        if (!active) return;
        // setInvoice(res.data);
      } catch {
        // router.push("/invoices");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, router]);

  const handleDelete = async () => {
    if (!invoice) return;
    try {
      setDeleteLoading(true);
      // await invoicesApi.delete(invoice.id);
      toast.success('Invoice deleted');
      // router.push("/invoices");
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const items = invoice?.invoiceItems ?? [];
  const revenue = useMemo(
    () => sumTree(items, (i) => i.salesPrice ?? 0),
    [items],
  );
  const cost = useMemo(
    () => sumTree(items, (i) => i.purchasePrice ?? 0),
    [items],
  );
  const grossProfit = revenue - cost;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading invoice...
        </p>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice #{invoice.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage details, items, and approvals.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Info & Line Items (Spans 8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date
                  </p>
                  <p className="font-medium">{invoice.date}</p>
                </div>

                {invoice.customer && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer
                    </p>
                    <Link
                      // href={`/customers/${invoice.customer.id}`}
                      className="font-medium text-primary hover:underline"
                      href={'/'}
                    >
                      {invoice.customer.name}
                    </Link>
                  </div>
                )}

                {invoice.description && (
                  <div className="sm:col-span-2 space-y-1 pt-2">
                    <p className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Description
                    </p>
                    <p className="font-medium">{invoice.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">
                Line Items
              </CardTitle>
              <div className="text-sm font-medium px-2.5 py-1 bg-muted rounded-full">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border border-t">
                {items.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center">
                    <Package className="w-8 h-8 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No items on this invoice.
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <InvoiceItemRow key={item.id} item={item} />
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-muted/30 border-t rounded-b-xl">
                  <span className="font-semibold text-muted-foreground">
                    Total Revenue
                  </span>
                  <span className="text-lg font-bold">
                    {Money.format(revenue)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary & Actions (Spans 4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Invoice Summary Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">{Money.format(revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{Money.format(cost)}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-base">Gross Profit</span>
                <span
                  className={`font-bold text-base ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
                >
                  {Money.format(grossProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <Button
              variant="default"
              className="w-full justify-start gap-2 shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>Approve</span>
            </Button>

            <Button
              onClick={() => {
                router.push(`/app/invoices/${params.invoiceId}/editor`);
              }}
              variant="secondary"
              className="w-full shadow-sm"
            >
              <PenBoxIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" className="w-full shadow-sm">
              <File className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="destructive"
              className="w-full shadow-sm"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
