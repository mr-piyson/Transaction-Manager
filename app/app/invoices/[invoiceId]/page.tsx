'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
  ChevronLeft,
} from 'lucide-react';
import {
  useGetInvoiceWithDetails,
  useDeleteInvoice,
  useUpdateInvoice,
} from '@/hooks/data/use-invoices';
import { alert } from '@/components/Alert-dialog';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Format } from '@/lib/format';

function InvoiceLineRow({ line, lines, depth = 0 }: { line: any; lines: any[]; depth?: number }) {
  const childLines = lines.filter((l) => l.parentId === line.id);

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
              {line.description || line.itemRef?.name || (line.isGroup ? 'Group' : 'Item')}
            </p>
            {line.itemRef?.code && (
              <p className="text-xs text-muted-foreground font-mono">{line.itemRef.code}</p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-semibold">{Format.money.amount(line.total || 0)}</p>
          <p className="text-xs text-muted-foreground">Qty: {line.quantity || 1}</p>
        </div>
      </div>

      {childLines.map((sub) => (
        <InvoiceLineRow key={sub.id} line={sub} lines={lines} depth={depth + 1} />
      ))}
    </>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.invoiceId as string;

  const { data: invoice, isLoading, isError } = useGetInvoiceWithDetails(invoiceId);
  const deleteMutation = useDeleteInvoice();
  const updateMutation = useUpdateInvoice();

  const handleDelete = () => {
    if (!invoice) return;
    deleteMutation.mutate(String(invoice.id), {
      onSuccess: () => {
        toast.success('Invoice deleted');
        router.push('/app/invoices');
      },
      onError: (e) => {
        toast.error(e.message ?? 'Delete failed');
      },
    });
  };

  const handleApprove = () => {
    if (!invoice) return;
    updateMutation.mutate(
      {
        id: String(invoice.id),
        data: { isCompleted: true },
      },
      {
        onSuccess: () => toast.success('Invoice approved'),
        onError: (e) => toast.error(e.message ?? 'Approval failed'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Invoice not found or failed to load.</p>
      </div>
    );
  }

  const lines = (invoice as any).invoiceLines || [];
  const rootLines = lines.filter((l: any) => !l.parentId);

  const revenue = invoice.total || 0;
  // Estimate cost from lines
  const cost = lines.reduce(
    (acc: number, l: any) => acc + (l.purchasePrice || 0) * (l.quantity || 1),
    0,
  );
  const grossProfit = revenue - cost;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center text-sm text-muted-foreground mb-2">
              <Link
                href="/app/invoices"
                className="hover:text-primary transition-colors flex items-center"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Invoices
              </Link>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              Invoice #{invoice.id}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* make a modren switch button for invoice completed or still */}
            <Label
              className={cn(
                'w-[120px] h-[35px] rounded-lg flex items-center justify-between px-3 border',
                invoice.isCompleted ? 'bg-default border-primary' : 'bg-muted',
              )}
            >
              {/* Left placeholder (OFF state) */}
              <span
                className={`text-sm transition-opacity ${
                  invoice.isCompleted ? 'opacity-30' : 'opacity-100'
                }`}
              >
                {/* show loading */}
                {updateMutation.isPending ? <Spinner /> : invoice.isCompleted ? 'Done' : 'Pending'}
              </span>

              <Switch
                disabled={updateMutation.isPending}
                size="default"
                checked={invoice.isCompleted}
                onCheckedChange={(checked) => {
                  updateMutation.mutate(
                    {
                      id: String(invoice.id),
                      data: { isCompleted: checked },
                    },
                    {
                      onError: (e) => toast.error(e.message ?? 'Update failed'),
                    },
                  );
                }}
              />
            </Label>

            <Button size="lg" variant="outline" className="shadow-sm border-dashed">
              <File className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Download PDF</span>
            </Button>

            <Button
              size="lg"
              onClick={() => {
                router.push(`/app/invoices/${params.invoiceId}/editor`);
              }}
              variant="secondary"
              className="shadow-sm"
            >
              <PenBoxIcon className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Edit</span>
            </Button>

            {/* Text Layer */}
            <span
              className={cn(
                'absolute inset-0 flex items-center text-xs font-semibold px-2 pointer-events-none transition-all duration-300',
                invoice.isCompleted ? 'justify-start text-white' : 'justify-end text-gray-700',
              )}
            ></span>

            <Button
              size="lg"
              variant="destructive"
              onClick={() => {
                alert.delete({
                  title: 'Are you sure you want to delete this invoice?',
                  description: 'This action cannot be undone.',
                  onConfirm: () => {
                    handleDelete();
                  },
                });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Content Column */}
          <div className="flex-1 w-full flex flex-col space-y-6">
            {/* Metadata Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Invoice Information</CardTitle>
                <CardDescription>
                  Customer and date details associated with this receipt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row flex-wrap gap-8 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Date
                    </span>
                    <span className="font-medium">
                      {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  {(invoice as any).customer && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" /> Customer
                      </span>
                      <Link className="font-medium text-primary hover:underline" href={'/'}>
                        {(invoice as any).customer.name}
                      </Link>
                    </div>
                  )}
                </div>

                {invoice.description && (
                  <div className="flex flex-col space-y-1 pt-6 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Description
                    </span>
                    <span className="font-medium max-w-2xl leading-relaxed">
                      {invoice.description}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Line Items</CardTitle>
                </div>
                <div className="text-sm font-medium px-2.5 py-1 bg-muted rounded-full">
                  {lines.length} {lines.length === 1 ? 'Item' : 'Items'}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-border border-t">
                  {rootLines.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center">
                      <Package className="w-8 h-8 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No items on this invoice.</p>
                    </div>
                  ) : (
                    rootLines.map((line: any) => (
                      <InvoiceLineRow key={line.id} line={line} lines={lines} />
                    ))
                  )}
                </div>

                {lines.length > 0 && (
                  <div className="flex justify-between items-center p-4 bg-muted/30 border-t rounded-b-xl">
                    <span className="font-semibold text-muted-foreground">Total Revenue</span>
                    <span className="text-lg font-bold">{Format.money.amount(revenue)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col space-y-6">
            <Card className="shadow-sm border-dashed">
              <CardHeader className="pb-4 bg-muted/10 rounded-t-xl">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col py-6 space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{Format.money.amount(revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-medium">{Format.money.amount(cost)}</span>
                </div>

                <Separator />

                <div className="flex justify-between items-end pt-2">
                  <span className="font-semibold text-muted-foreground">Gross Profit</span>
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-bold text-2xl leading-none ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
                    >
                      {Format.money.amount(grossProfit)}
                    </span>
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
