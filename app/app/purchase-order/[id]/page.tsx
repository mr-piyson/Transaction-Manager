'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import {
  Loader2,
  Calendar,
  FileText,
  Package,
  File,
  CheckCircle2,
  ChevronLeft,
  Banknote,
  CreditCard,
  Clock,
  Phone,
  Mail,
  Truck,
  Building2,
  MapPin,
  PackageCheck,
  PackageOpen,
  XCircle,
  TruckIcon
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { cn, formatAmount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const PO_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: Clock },
  ORDERED: { label: 'Ordered', variant: 'default', icon: Truck },
  PARTIAL_RECEIVED: { label: 'Partial', variant: 'outline', icon: PackageOpen },
  RECEIVED: { label: 'Received', variant: 'default', icon: PackageCheck },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function PurchaseLineRow({ line }: { line: any }) {
  const remaining = Number(line.quantity) - Number(line.receivedQty);
  return (
    <div className="flex items-center justify-between py-3 px-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary">
          <Package className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-none mb-1">
            {line.description || line.item?.name || 'Item'}
          </p>
          {line.item?.sku && (
            <p className="text-xs text-muted-foreground font-mono">{line.item.sku}</p>
          )}
        </div>
      </div>

      <div className="text-right shrink-0 ml-4 flex gap-8 items-center">
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Quantity</p>
          <div className="flex items-center justify-end gap-2 text-sm font-medium">
            <span>{Number(line.quantity)} {line.item?.unit}</span>
            {Number(line.receivedQty) > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-600 border-green-200">
                {Number(line.receivedQty)} Rcvd
              </Badge>
            )}
          </div>
        </div>

        <div className="text-right w-24">
          <p className="text-sm font-semibold">{formatAmount(Number(line.total))}</p>
          <p className="text-xs text-muted-foreground">{formatAmount(Number(line.unitCost))} / unit</p>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const utils = trpc.useUtils();
  const { data: po, isLoading, isError, refetch } = trpc.purchaseOrders.getById.useQuery({ id });

  const markOrderedMutation = trpc.purchaseOrders.markOrdered.useMutation({
    onSuccess: () => {
      toast.success('Purchase order marked as ordered');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update status');
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Purchase order not found or failed to load.</p>
        </div>
      </div>
    );
  }

  const StatusIcon = PO_STATUS_CONFIG[po.status]?.icon || Clock;
  const statusConfig = PO_STATUS_CONFIG[po.status] || PO_STATUS_CONFIG.DRAFT;

  return (
    <div className="flex flex-col bg-background min-h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center text-sm text-muted-foreground mb-2">
              <Link href="/app/purchase-order" className="hover:text-primary transition-colors flex items-center">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Purchase Orders
              </Link>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              {po.serial}
              <Badge variant={statusConfig.variant} className="ml-2 text-sm px-2.5 py-0.5">
                <StatusIcon className="w-4 h-4 mr-1.5" />
                {statusConfig.label}
              </Badge>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {po.status === 'DRAFT' && (
              <Button 
                onClick={() => markOrderedMutation.mutate({ id: po.id })}
                disabled={markOrderedMutation.isPending}
                className="shadow-sm"
              >
                {markOrderedMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TruckIcon className="w-4 h-4 mr-2" />}
                Mark as Ordered
              </Button>
            )}

            <Button size="default" variant="outline" className="shadow-sm border-dashed">
              <File className="w-4 h-4 mr-2" />
              <span>Download PDF</span>
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
                <CardTitle className="text-base font-semibold">Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row flex-wrap gap-8 text-sm">
                  {/* Date Field */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Order Date
                    </span>
                    <span className="font-medium">{new Date(po.date).toLocaleDateString()}</span>
                  </div>

                  {/* Expected Date */}
                  {po.expectedDate && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Expected Delivery
                      </span>
                      <span className="font-medium">{new Date(po.expectedDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Total Amount */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Total Amount
                    </span>
                    <span className="font-bold text-lg text-primary">{formatAmount(Number(po.total), po.currency)}</span>
                  </div>
                  
                  {/* Amount Owed */}
                  {Number(po.amountOwed) > 0 && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Balance Due
                      </span>
                      <span className="font-semibold text-destructive">{formatAmount(Number(po.amountOwed), po.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Warehouse */}
                {po.warehouse && (
                  <div className="flex flex-col space-y-1 pt-6 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Destination Warehouse
                    </span>
                    <span className="font-medium">
                      {po.warehouse.name}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {po.notes && (
                  <div className="flex flex-col space-y-1 pt-6 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Notes
                    </span>
                    <span className="font-medium max-w-2xl leading-relaxed whitespace-pre-wrap">
                      {po.notes}
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
                  {po.lines.length} {po.lines.length === 1 ? 'Item' : 'Items'}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-border border-t">
                  {po.lines.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center">
                      <Package className="w-8 h-8 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No items on this order.</p>
                    </div>
                  ) : (
                    po.lines.map((line: any) => (
                      <PurchaseLineRow key={line.id} line={line} />
                    ))
                  )}
                </div>

                <CardFooter className="bg-muted/20 flex-col items-end py-4 gap-2">
                  <div className="w-full flex justify-between max-w-xs text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatAmount(Number(po.subtotal), po.currency)}</span>
                  </div>
                  {Number(po.taxTotal) > 0 && (
                    <div className="w-full flex justify-between max-w-xs text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatAmount(Number(po.taxTotal), po.currency)}</span>
                    </div>
                  )}
                  <div className="w-full flex justify-between max-w-xs border-t pt-2 mt-1">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatAmount(Number(po.total), po.currency)}</span>
                  </div>
                </CardFooter>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col space-y-6">
            {/* Supplier Card */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Supplier</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 rounded-lg border bg-muted">
                    <AvatarFallback className="rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-base truncate">
                      {po.supplier?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      Supplier
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {po.supplier?.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" /> Phone
                      </div>
                      <span className="font-medium">{po.supplier.phone}</span>
                    </div>
                  )}

                  {po.supplier?.email && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" /> Email
                      </div>
                      <span className="font-medium truncate max-w-[150px]">{po.supplier.email}</span>
                    </div>
                  )}

                  {po.supplier?.address && (
                    <div className="flex items-start justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4" /> Address
                      </div>
                      <span className="font-medium text-right max-w-[150px] break-words">{po.supplier.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payments Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Payments</CardTitle>
                  <Badge variant="secondary">{po.payments.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {po.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
                ) : (
                  <div className="space-y-4">
                    {po.payments.map((payment: any) => (
                      <div key={payment.id} className="flex flex-col space-y-1 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{formatAmount(Number(payment.amount), po.currency)}</span>
                          <span className="text-xs font-mono text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span className="capitalize">{payment.method.toLowerCase()}</span>
                          {payment.reference && <span className="truncate max-w-[120px]">Ref: {payment.reference}</span>}
                        </div>
                      </div>
                    ))}
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
