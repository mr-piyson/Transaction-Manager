'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Hash,
  StickyNote,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Trash2,
  MoreVertical,
  Globe,
  ShoppingCart,
  Package,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import { formatAmount, formatDate } from '@/lib/utils';
import { SupplierFormDialog } from '../supplier-form-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;

  const content = (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 text-sm font-medium text-foreground truncate ${href ? 'text-primary hover:underline' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : '_self'}>
      {content}
    </a>
  ) : (
    content
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
          {count}
        </Badge>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-4 lg:w-72 xl:w-80 shrink-0">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const utils = trpc.useUtils();
  const { data: supplier, isLoading, error } = trpc.suppliers.getById.useQuery({ id });
  const { data: purchaseOrders = [], isLoading: posLoading } = trpc.purchaseOrders.list.useQuery({
    supplierId: id,
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => router.push('/app/suppliers'),
    onError: (err) => alert(err.message),
  });

  if (isLoading) return <DetailSkeleton />;

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <p className="font-semibold">Supplier not found</p>
        <Button variant="outline" onClick={() => router.push('/app/suppliers')}>
          Go back
        </Button>
      </div>
    );
  }

  function handleDelete() {
    if (!confirm(`Delete "${supplier!.name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate({ id });
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-background">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/app/suppliers')}
        >
          <ArrowLeft className="size-4" />
          Suppliers
        </Button>

        <div className="flex items-center gap-2">
          {!supplier.isSystem && (
            <SupplierFormDialog supplier={supplier as any}>
              <Button variant="outline" size="sm" className="gap-2">
                Edit
              </Button>
            </SupplierFormDialog>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              }
            ></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link href={`/app/purchase-order/new`}>New Purchase Order</Link>}
              ></DropdownMenuItem>
              {!supplier.isSystem && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR */}
        <div className="flex flex-col gap-4 w-full lg:w-72 xl:w-80 shrink-0">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="h-16 w-full bg-secondary/90" />
            <div className="flex flex-col items-center -mt-8 pb-5 px-5">
              <Avatar className="flex size-16 items-center justify-center rounded-full shadow-lg ring-4 ring-background bg-card text-muted-foreground">
                <AvatarFallback>
                  <Building2 size={32} />
                </AvatarFallback>
              </Avatar>

              <h1 className="mt-3 text-center text-lg font-bold text-foreground leading-tight">
                {supplier.name}
              </h1>
              {supplier.contactName && (
                <p className="text-sm text-muted-foreground mt-1">Attn: {supplier.contactName}</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <Badge variant={supplier.isActive ? 'default' : 'secondary'} className="text-xs">
                  {supplier.isActive ? (
                    <>
                      <CheckCircle2 className="size-3 mr-1" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="size-3 mr-1" /> Inactive
                    </>
                  )}
                </Badge>
                {supplier.isSystem && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="px-5 py-2 divide-y divide-border/60">
              <InfoRow
                icon={Phone}
                label="Phone"
                value={supplier.phone}
                href={supplier.phone ? `tel:${supplier.phone}` : undefined}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={supplier.email}
                href={supplier.email ? `mailto:${supplier.email}` : undefined}
              />
              <InfoRow
                icon={Globe}
                label="Website"
                value={supplier.website}
                href={supplier.website || undefined}
              />
              <InfoRow icon={MapPin} label="Address" value={supplier.address} />
              <InfoRow icon={Hash} label="Tax ID" value={supplier.taxId} />
            </div>
          </div>

          {supplier.notes && (
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <SectionHeader icon={StickyNote} title="Notes" />
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Recent Purchase Orders */}
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                icon={ShoppingCart}
                title="Purchase Orders"
                count={purchaseOrders.length}
              />
              <Link href={`/app/purchase-order`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs -mt-3">
                  View all <ChevronRight className="size-3" />
                </Button>
              </Link>
            </div>

            {posLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <ShoppingCart className="size-8 opacity-40" />
                <p className="text-sm">No purchase orders yet</p>
                <Link href={`/app/purchase-order/new`}>
                  <Button size="sm" variant="outline">
                    Create PO
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {purchaseOrders.slice(0, 5).map((po: any) => (
                  <Link
                    key={po.id}
                    href={`/app/purchase-order/${po.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{po.serial}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(new Date(po.date))}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatAmount(Number(po.total))}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{po.status}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Price List (Items) */}
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                icon={Package}
                title="Priced Items"
                count={supplier.supplierItems.length}
              />
            </div>

            {supplier.supplierItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Package className="size-8 opacity-40" />
                <p className="text-sm">No specific priced items recorded</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {supplier.supplierItems.map((si: any) => (
                  <div key={si.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {si.item.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {si.supplierSku && <span>SKU: {si.supplierSku}</span>}
                        {si.leadTimeDays ? <span>{si.leadTimeDays} days lead time</span> : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatAmount(Number(si.basePrice))}</p>
                      <p className="text-xs text-muted-foreground">per {si.item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
