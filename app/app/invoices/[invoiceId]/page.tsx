'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
  UserCheck,
  Banknote,
  CreditCard,
  CheckCircle,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  HandCoinsIcon,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { cn, formatAmount, generateID } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDateFormat } from '@/hooks/use-date-format';

function InvoiceLineRow({ line, lines, depth = 0 }: { line: any; lines: any[]; depth?: number }) {
  const childLines = lines.filter((l) => l.parentId === line.id);

  return (
    <>
      <div
        className={`flex items-center justify-between py-3 px-4 transition-colors hover:bg-muted/50 ${depth > 0 ? ' border-l-2 border-muted/50 ms-4' : ''}`}
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
          <p className="text-sm font-semibold">{formatAmount(line.total || 0)}</p>
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
  const { formatDate } = useDateFormat();

  const utils = trpc.useUtils();
  const {
    data: invoice,
    isLoading,
    isError,
    refetch,
  } = trpc.invoices.getInvoiceById.useQuery({
    id: Number(invoiceId),
    include: {
      customer: true,
      invoiceLines: true,
      payments: true,
    },
  });

  const deleteMutation = trpc.invoices.deleteInvoice.useMutation();
  const updateMutation = trpc.invoices.updateInvoice.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = () => {
    if (!invoice) return;
    deleteMutation.mutate(
      { id: Number(invoice.id) },
      {
        onSuccess: () => {
          router.push('/app/invoices');
        },
        onError: (e) => {
          toast.error('Delete failed');
        },
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
  return (
    <div className="flex flex-col bg-background">
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
              {generateID('INV', invoice.id)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* make a modren switch button for invoice completed or still */}
            <Label
              className={cn(
                'drop-shadow-sm w-30 h-8.75 rounded-lg flex items-center justify-between px-3 border',
                invoice.status === 'PAID' ? 'bg-default border-primary' : 'bg-muted',
              )}
            >
              {/* Left placeholder (OFF state) */}
              <span
                className={`text-sm transition-opacity ${
                  invoice.status === 'PAID' ? 'opacity-30' : 'opacity-100'
                }`}
              >
                {/* show loading */}
                {updateMutation.isPending ? <Spinner /> : invoice.status === 'PAID' ? 'Done' : 'Pending'}
              </span>

              <Switch
                disabled={updateMutation.isPending}
                size="default"
                className={'border-muted-foreground/50'}
                checked={invoice.status === 'PAID'}
                onCheckedChange={(checked) => {
                  console.log(checked);
                  updateMutation.mutate(
                    {
                      id: Number(invoice.id),
                      data: { isCompleted: checked },
                    },
                    {
                      onError: (e) => toast.error('Update failed'),
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
              className="shadow-sm border-secondary/50"
            >
              <PenBoxIcon className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Edit</span>
            </Button>

            {/* Text Layer */}
            <span
              className={cn(
                'absolute inset-0 flex items-center text-xs font-semibold px-2 pointer-events-none transition-all duration-300',
                invoice.status === 'PAID' ? 'justify-start text-white' : 'justify-end text-gray-700',
              )}
            ></span>
            {/* Payment Button */}
            {/* <PaymentDialog invoice={invoice}>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-success/10 text-success hover:bg-success/20 ml-auto border-2 border-success/50"
                disabled={false}
              >
                <HandCoinsIcon size={13} />
                <span>Pay</span>
              </Button>
            </PaymentDialog> */}

            {/* Delete Button */}
            {/* <Button
              size="lg"
              variant="destructive"
              className={'shadow-sm border-destructive'}
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
            </Button> */}
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
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row flex-wrap gap-8 text-sm">
                  {/* Existing Date Field */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Date
                    </span>
                    <span className="font-medium">{formatDate(invoice.date)}</span>
                  </div>

                  {/* Existing Customer Field */}
                  {(invoice as any).customer && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" /> Customer
                      </span>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/app/customers/${invoice.customerId}`}
                      >
                        {(invoice as any)?.customer?.name}
                      </Link>
                    </div>
                  )}

                  {/* NEW: Payment Status  */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Status
                    </span>
                    <span
                      className={`font-medium ${invoice.status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {invoice.status}
                    </span>
                  </div>

                  {/* NEW: Total Amount [cite: 2, 25] */}
                  {/* Note: Values are stored in smallest units like fils or cents  */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Total
                    </span>
                    <span className="font-bold">{formatAmount(invoice.total || 0)}</span>
                  </div>

                  {/* NEW: Created By  */}
                  {invoice?.createdAt && (
                    <div className="flex flex-col  space-y-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Created By
                      </span>
                      <span className="font-medium">{'Me'}</span>
                    </div>
                  )}
                </div>

                {/* Existing Description */}
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

                {/* NEW: Completion Badge  */}
                <div className="flex flex-col pt-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    {invoice.status === 'PAID' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}{' '}
                    Status
                  </span>
                  <div className="py-2 text-xs inline-block">
                    {invoice.status === 'PAID' ? (
                      <Badge variant="default">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant={'secondary'}>
                        <Clock className="w-4 h-4" />
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
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

                <CardFooter className="bg-muted/20">
                  {lines.length > 0 && (
                    <div className="w-full flex justify-between">
                      <span className="font-semibold text-muted-foreground">Total Revenue</span>
                      <span className="text-lg font-bold">{formatAmount(revenue)}</span>
                    </div>
                  )}
                </CardFooter>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col space-y-6">
            {/* Customer Card */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Customer</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Top Section */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={(invoice as any)?.customer?.image} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Customer Name</span>
                    <span className="font-semibold text-base">
                      {(invoice as any)?.customer?.name || 'Unknown'}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Info Section */}
                <div className="space-y-4">
                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="h-4 w-4" />
                      Phone
                    </div>
                    <span className="font-medium text-sm">
                      {(invoice as any)?.customer?.phone || 'N/A'}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <span className="font-medium text-sm truncate max-w-[180px] text-right">
                      {(invoice as any)?.customer?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Status
                  </span>
                  {(invoice as any).payments.map((payment: any) => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
