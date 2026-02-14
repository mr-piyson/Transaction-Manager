"use client";
import { ListView } from "@/components/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { InvoiceItems } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, LucideFileText, Pen, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { UniversalContextMenu } from "@/components/context-menu";
import { UniversalDialog } from "@/components/dialog";
import { queryClient } from "@/app/app/App";
import { toast } from "sonner";

type InvoiceItemsPageProps = {
  children?: React.ReactNode;
};

export default function InvoiceItemsPage(props: InvoiceItemsPageProps) {
  const header = useHeader();
  const { invoiceId, recordId } = useParams();
  const router = useRouter();
  const fab = useFab();

  const {
    data: invoices,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoicesItems", invoiceId],
    queryFn: async () => (await axios.get(`/api/records/${recordId}/invoices/${invoiceId}`)).data,
  });

  const invoiceItems = Array.isArray(invoices) ? invoices : [];
  const hasInvoices = invoiceItems.length > 0;

  const handlePay = async (items: InvoiceItems[]) => {
    if (!items.length) return;
    try {
      await axios.post(`/api/records/${recordId}/invoices/${invoiceId}/pay`, { items });
      await refetch();
    } finally {
    }
  };

  useEffect(() => {
    console.log(invoices);
    header.configureHeader({
      leftContent: (
        <div className="flex h-full w-full items-center gap-4">
          <Button variant={"ghost"} className="p-1" onClick={() => router.back()}>
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-2xl font-semibold">INV-{invoiceId}</h1>
        </div>
      ),
      rightContent: (
        <>
          <Button variant="default" disabled={isLoading || !!error || !hasInvoices} onClick={() => router.push(`/app/records/${recordId}/invoices/${invoiceId}/invoice`)}>
            Invoice
          </Button>
          <Button variant="default" disabled={isLoading || !!error || !hasInvoices} onClick={() => handlePay(invoiceItems)}>
            Pay
          </Button>
        </>
      ),
    });

    fab.setFabConfig({
      visible: true,
      render: () => (
        <UniversalDialog
          title={""}
          fields={[
            {
              name: "title",
              type: "text",
              width: "full",
              label: "Name :",
            },
            {
              defaultValue: 0,
              name: "amount",
              type: "number",
              label: "Unit Price :",
            },
            {
              defaultValue: 1,
              name: "qty",
              type: "number",
              label: "Quantity :",
            },
          ]}
          apiMethod="POST"
          apiEndpoint={`/api/records/${recordId}/invoices/${invoiceId}`}
          onSuccess={() => refetch()}
        >
          <Button variant="default" size="icon" className="absolute -top-6 left-1/2 -translate-x-1/2 size-14 rounded-full shadow-lg">
            <svg className="icon-[hugeicons--file-01] size-7 text-foreground" />
          </Button>
        </UniversalDialog>
      ),
    });

    return () => {
      header.resetHeader();
      fab.resetFabConfig();
    };
  }, [invoices]);

  return (
    <div className="flex-1 h-full">
      <ListView<InvoiceItems>
        emptyTitle="No Invoice Items Found"
        emptyIcon={<LucideFileText className="size-16 text-muted-foreground" />}
        emptyDescription={"create new invoice items to get started"}
        data={invoices}
        isLoading={isLoading}
        isError={!!error}
        itemName="invoice items"
        useTheme={true}
        cardRenderer={InvoiceItemRow}
        rowHeight={70}
        searchFields={[]}
      />
    </div>
  );
}

const InvoiceItemRow = ({ data: item }: { data: InvoiceItems }) => {
  const { invoiceId, recordId } = useParams();
  // 1. Calculate Line Total: (Qty * Amount) - Discount + Tax
  const lineMetrics = useMemo(() => {
    const subtotal = item.amount * item.qty;
    const discountVal = item.discount || 0;
    const taxVal = item.tax || 0;
    const total = subtotal - discountVal + taxVal;

    return {
      total: total,
      hasAdjustments: discountVal > 0 || taxVal > 0,
    };
  }, [item]);

  // 2. Format Currency (Bahrain Dinar 3 decimal places as per your sample)
  const formatMoney = (val: number) => val.toFixed(3);

  const context_menu_conf = useMemo(
    () => [
      {
        id: "update",
        label: "Update",
        icon: <Pen />,
        onClick: () => {},
      },
      {
        id: "delete",
        label: "Delete",
        icon: <Trash2 className="text-destructive" />,
        destructive: true,
        onClick: async () => {
          try {
            const res = await axios.delete(`/api/records/${recordId}/invoices/${invoiceId}`, { params: { itemId: item.id } });
            if (res.data.error) toast.error(res.data.error);
            queryClient.refetchQueries({
              queryKey: ["invoicesItems", invoiceId],
            });
          } catch (e) {}
        },
      },
    ],
    [],
  );

  return (
    <UniversalContextMenu items={context_menu_conf}>
      <div className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50 border-b border-border last:border-0">
        {/* Icon Section */}
        <div className="flex items-center justify-center size-10 rounded-lg bg-secondary/20">
          {/* Swapped icon for a generic item/product icon */}
          <span className="icon-[hugeicons--package] size-6 text-foreground/60" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{item.description || `Item #${item.id}`}</p>
            {/* Optional: Badge for item type */}
            {item.type !== "PRODUCT" && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {item.type}
              </Badge>
            )}
          </div>

          {/* Subtext: Calculation details */}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>
              {item.qty} x {formatMoney(item.amount)}
            </span>
            {item.currency || "BD"}

            {/* Show simplified adjustment hints if tax/discount exists */}
            {lineMetrics.hasAdjustments && <span className="ml-1 text-[10px] opacity-80">(incl. tax/disc)</span>}
          </p>
        </div>

        {/* Right Side: Financials */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold text-sm">
              {formatMoney(lineMetrics.total)} {item.currency || "BD"}
            </p>
            {/* Optional: Show discount in red if applied */}
            {item.discount && item.discount > 0 ? <p className="text-[10px] text-success">-{formatMoney(item.discount)} Disc.</p> : null}
          </div>
        </div>
      </div>
    </UniversalContextMenu>
  );
};
