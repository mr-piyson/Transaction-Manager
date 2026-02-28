"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  User,
  Calendar,
  FileText,
  Package,
  File,
  PenBoxIcon,
  CheckCircle,
  Check,
} from "lucide-react";
import { Money } from "@/lib/money";

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
        className={`flex items-center justify-between py-2.5 ${
          depth > 0 ? "pl-6 border-l-2 border-muted ml-4" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              depth > 0 ? "bg-muted" : "bg-primary/10"
            }`}
          >
            <Package
              className={`w-3 h-3 ${
                depth > 0 ? "text-muted-foreground" : "text-primary"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.description}</p>
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
            cost: {Money.format(item.purchasePrice)}
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

  const [invoice, setInvoice] = useState<Invoice | null>({
    id: 1,
    date: new Date().toDateString(),
    invoiceItems: [
      {
        id: 1,
        description: "dsfsdklfhs",
        salesPrice: 0,
        purchasePrice: 0,
        code: "sdfsdf",
        subItems: [
          {
            id: 3,
            description: "dsfsdklfhs",
            salesPrice: 10,
            purchasePrice: 3.7,
            code: "sdfsdf",
          },
          {
            id: 5,
            description: "dsfsdklfhs",
            salesPrice: 10,
            purchasePrice: 3.7,
            code: "sdfsdf",
          },
        ],
      },
      {
        id: 2,
        description: "dsfsdklfhs",
        salesPrice: 10,
        purchasePrice: 3.7,
        code: "sdfsdf",
      },
    ],
    customer: { id: 1, name: "Muntadher" },
    description: "dsfsdfdsf",
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
      toast.success("Invoice deleted");
      // router.push("/invoices");
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Metadata */}

      <div className="space-y-4 col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Invoice info
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{invoice.date}</span>
            </div>

            {invoice.customer && (
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-muted-foreground" />
                <Link
                  // href={`/customers/${invoice.customer.id}`}
                  className="text-primary hover:underline"
                  href={"/"}
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
      </div>
      <div className="h-fit grid grid-cols-2 gap-3">
        <Button variant="destructive" className="w-full">
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Delete invoice
        </Button>
        <Button variant="success" className="w-full">
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <File className="w-4 h-4 mr-2" />
          )}
          PDF
        </Button>
        <Button variant="secondary" className="w-full">
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <PenBoxIcon className="w-4 h-4 mr-2" />
          )}
          Edit
        </Button>
        <Button variant="default" className="w-full">
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Approve
        </Button>
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
            items.map((item) => <InvoiceItemRow key={item.id} item={item} />)
          )}

          {items.length > 0 && (
            <div className="flex justify-between py-4 font-semibold">
              <span>Total</span>
              <span className="text-lg">{Money.format(revenue)}</span>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Summary</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-medium">{Money.format(revenue)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium">{Money.format(cost)}</span>
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
              {Money.format(revenue - cost)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
