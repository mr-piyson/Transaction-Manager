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
  CreditCard,
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Edit2,
  Trash2,
  TrendingDown,
  Calendar,
  MoreVertical,
  Receipt,
  Activity,
  User2,
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
import { CustomerFormDialog } from '../customer-form-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

// ---------------------------------------------------------------------------
// Invoice status config
// ---------------------------------------------------------------------------

const INVOICE_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: React.ElementType;
  }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: Clock },
  SENT: { label: 'Sent', variant: 'default', icon: CheckCircle2 },
  PARTIAL: { label: 'Partial', variant: 'outline', icon: Activity },
  PAID: { label: 'Paid', variant: 'default', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  OVERDUE: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
};

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-slate-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500' },
};

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

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
          className={`mt-0.5 text-sm font-medium text-foreground truncate ${
            href ? 'text-primary hover:underline' : ''
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  return href ? <a href={href}>{content}</a> : content;
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

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

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
          <div className="flex gap-4">
            <Skeleton className="h-24 flex-1 rounded-xl" />
            <Skeleton className="h-24 flex-1 rounded-xl" />
            <Skeleton className="h-24 flex-1 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const params = useParams();
  const router = useRouter();
  const id = params.customerId as string;
  console.log(id);

  const [editOpen, setEditOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.customers.getById.useQuery({ id: id });
  const { data: recentInvoices = [], isLoading: invoicesLoading } =
    trpc.customers.recentInvoices.useQuery({ customerId: id, limit: 10 });

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => router.push('/app/customers'),
  });

  if (isLoading) return <DetailSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <p className="font-semibold">Customer not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const customer = data;
  const arBalance = Number(customer.arBalance ?? 0);
  const creditLimit = Number(customer.creditLimit ?? 0);
  const creditUsedPct = creditLimit > 0 ? Math.min((arBalance / creditLimit) * 100, 100) : 0;

  function handleDelete() {
    if (!confirm(`Delete "${customer.name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate({ id });
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-background">
        {/* ── Breadcrumb / back nav ──────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/app/customers')}
          >
            <ArrowLeft className="size-4" />
            Customers
          </Button>

          {/* Top-right actions */}
          <div className="flex items-center gap-2">
            <CustomerFormDialog customer={customer as any}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit2 className="size-4" />
                Edit
              </Button>
            </CustomerFormDialog>

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
                  render={<Link href={`/app/invoices`}>New Invoice</Link>}
                ></DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href={`/app/jobs`}>New Job</Link>}
                ></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Main layout: sidebar + content ────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ════════════════════════════════════════════════════════════
              LEFT SIDEBAR
          ════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4 w-full lg:w-72 xl:w-80 shrink-0">
            {/* Identity card */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Colored band */}
              <div className="h-16 w-full bg-secondary/90" />

              {/* Avatar overlapping band */}
              <div className="flex flex-col items-center -mt-8 pb-5 px-5">
                <Avatar className="flex size-16 items-center justify-center rounded-full  font-bold shadow-lg ring-4 ring-muted-foreground">
                  <AvatarFallback>
                    <User2 size={32} />
                  </AvatarFallback>
                </Avatar>

                <h1 className="mt-3 text-center text-lg font-bold text-foreground leading-tight">
                  {customer.name}
                </h1>

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={customer.isActive ? 'default' : 'secondary'} className="text-xs">
                    {customer.isActive ? (
                      <>
                        <CheckCircle2 className="size-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>

                {/* Meta: joined date */}
                <p className="mt-2 text-xs text-muted-foreground">
                  Customer since {formatDate(customer.createdAt)}
                </p>
              </div>

              <Separator />

              {/* Contact & info rows */}
              <div className="px-5 py-2 divide-y divide-border/60">
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={customer.phone}
                  href={`tel:${customer.phone}`}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={customer.email}
                  href={`mailto:${customer.email}`}
                />
                <InfoRow icon={MapPin} label="Address" value={customer.address} />
                <InfoRow icon={Building2} label="City" value={customer.city} />
                <InfoRow icon={Hash} label="Tax ID" value={customer.taxId} />
              </div>
            </div>

            {/* Credit & AR card */}
            <div className="rounded-xl border bg-card shadow-sm p-5 flex flex-col gap-4">
              <SectionHeader icon={CreditCard} title="Credit & Balance" />

              {/* AR Balance */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AR Balance</span>
                <span
                  className={`text-sm font-bold ${
                    arBalance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatAmount(arBalance)}
                </span>
              </div>

              {/* Credit limit */}
              {creditLimit > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Credit Limit</span>
                    <span className="text-sm font-semibold">{formatAmount(creditLimit)}</span>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Used</span>
                      <span>{creditUsedPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          creditUsedPct > 80
                            ? 'bg-destructive'
                            : creditUsedPct > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${creditUsedPct}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {creditLimit === 0 && arBalance === 0 && (
                <p className="text-xs text-muted-foreground italic">No credit limit set</p>
              )}
            </div>

            {/* Notes card */}
            {customer.notes && (
              <div className="rounded-xl border bg-card shadow-sm p-5">
                <SectionHeader icon={StickyNote} title="Notes" />
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT CONTENT AREA
          ════════════════════════════════════════════════════════════ */}
          <div className="flex-1 w-full flex flex-col gap-4">
            {/* ── Recent Invoices ───────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader
                  icon={Receipt}
                  title="Recent Invoices"
                  count={recentInvoices.length}
                />
                <Link href={`/app`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs -mt-3">
                    View all <ChevronRight className="size-3" />
                  </Button>
                </Link>
              </div>

              {invoicesLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <FileText className="size-8 opacity-40" />
                  <p className="text-sm">No invoices yet</p>
                  <Link href={`/app`}>
                    <Button size="sm" variant="outline">
                      Create first invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {recentInvoices.map((inv: any) => {
                    const cfg = INVOICE_STATUS_CONFIG[inv.status] ?? INVOICE_STATUS_CONFIG.DRAFT;
                    const StatusIcon = cfg.icon;
                    return (
                      <Link
                        key={inv.id}
                        href={`/app`}
                        className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors group"
                      >
                        {/* Serial + type */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {inv.serial}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                              {inv.type?.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(inv.date)}
                          </p>
                        </div>

                        {/* Total */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">
                            {formatAmount(Number(inv.total))}
                          </p>
                          {Number(inv.amountDue) > 0 && (
                            <p className="text-[11px] text-destructive">
                              Due: {formatAmount(Number(inv.amountDue))}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <Badge variant={cfg.variant} className="shrink-0 gap-1 text-xs">
                          <StatusIcon className="size-3" />
                          {cfg.label}
                        </Badge>

                        <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Active Contracts ──────────────────────────────────── */}
            {customer.contracts && customer.contracts.length > 0 && (
              <div className="rounded-xl border bg-card shadow-sm p-5">
                <SectionHeader
                  icon={FileText}
                  title="Active Contracts"
                  count={customer.contracts.length}
                />
                <div className="flex flex-col divide-y divide-border/60">
                  {customer.contracts.map((contract: any) => (
                    <div key={contract.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {contract.title ?? contract.id}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(contract.startDate)}
                          </span>
                          {contract.endDate && (
                            <>
                              <span>→</span>
                              <span>{formatDate(contract.endDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={contract.isActive ? 'default' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {contract.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Jobs ─────────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={Briefcase} title="Jobs" count={customer._count?.jobs} />
                <Link href={`/app`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs -mt-3">
                    View all <ChevronRight className="size-3" />
                  </Button>
                </Link>
              </div>

              {/* Jobs are loaded via getById's related data — display contracts placeholder */}
              <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                <Briefcase className="size-7 opacity-40" />
                <p className="text-sm">
                  {customer._count?.jobs
                    ? `${customer._count.jobs} job${customer._count.jobs !== 1 ? 's' : ''} linked`
                    : 'No jobs yet'}
                </p>
                <Link href={'/app'}>
                  <Button size="sm" variant="outline">
                    {customer._count?.jobs ? 'View jobs' : 'Create first job'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
