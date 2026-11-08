"use client";

import {
  ArrowLeft,
  Box,
  Boxes,
  Check,
  CircleAlert,
  Copy,
  Edit,
  FileText,
  Hash,
  Info,
  Layers,
  type LucideIcon,
  Package,
  PackageOpen,
  Scale,
  ScanBarcode,
  ShoppingCart,
  Warehouse,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import { useUnifiedItemForm } from "@/components/dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";
import { cn, formatAmount } from "@/lib/utils";

const TYPE_STYLES = {
  PRODUCT: {
    icon: Box,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  },
  SERVICE: {
    icon: Wrench,
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  },
  BUNDLE: {
    icon: Boxes,
    className:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  },
} as const;

function getStockStatus(
  stock: number,
  minStock: number,
  reorderPoint: number,
  labels: { out: string; below: string; reorder: string; in: string },
) {
  if (stock <= 0) {
    return {
      label: labels.out,
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    };
  }
  if (stock <= minStock) {
    return {
      label: labels.below,
      icon: CircleAlert,
      className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    };
  }
  if (stock <= reorderPoint) {
    return {
      label: labels.reorder,
      icon: CircleAlert,
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    };
  }
  return {
    label: labels.in,
    icon: Check,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  };
}

/** Quantities can be fractional (up to 4 dp); never show exponential notation. */
function formatQty(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <h2 className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 text-sm font-medium break-words">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-2.5">
      <dt className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold break-words tabular-nums @sm:text-base">
        {value}
      </dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2.5 py-2">
      <dt className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function BooleanPill({ value }: { value: boolean }) {
  const t = useTranslations();
  return (
    <Badge
      variant={value ? "secondary" : "outline"}
      className={cn(
        "gap-1 font-normal",
        value
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-muted-foreground",
      )}
    >
      {value ? <Check className="size-3" /> : <X className="size-3" />}
      {value ? t("common.yes") : t("common.no")}
    </Badge>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 p-3 @sm:space-y-4 @sm:p-4 @2xl:max-w-4xl">
      <Card size="sm" className="gap-0 py-0">
        <div className="flex items-center gap-3 p-3 @sm:gap-4 @sm:p-4">
          <Skeleton className="size-16 shrink-0 rounded-lg @md:size-20" />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px border-t bg-border @xs:grid-cols-2 @xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="bg-card px-3 py-2.5">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="mt-1.5 h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>

      {[0, 1].map((index) => (
        <Card key={index} size="sm" className="gap-0 py-0">
          <div className="border-b px-3 py-2.5">
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-3 @2xl:grid-cols-3">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations();
  const { openEdit } = useUnifiedItemForm();
  const utils = trpc.useUtils();
  const { format: formatMoney } = useCurrency();
  const { formatDateTime } = useDateFormat();
  const {
    data: item,
    isLoading,
    isError,
  } = trpc.items.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);
  const [prevImage, setPrevImage] = useState(item?.image);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [params.id]);

  if (item?.image !== prevImage) {
    setPrevImage(item?.image);
    setImgError(false);
  }

  const unitCodes = useMemo(() => {
    const map = new Map<string, string>();
    if (item?.unitId) map.set(item.unitId, item.unit ?? "");
    for (const uom of item?.itemUoms ?? []) {
      map.set(uom.unitId, uom.unit.code);
    }
    return map;
  }, [item]);

  const goBack = () => router.push("/erp/items");
  const handleEdit = () => {
    if (!item) return;
    openEdit({
      itemId: item.id,
      onSuccess: () => {
        utils.items.list.invalidate();
        utils.items.byId.invalidate({ id: item.id });
      },
    });
  };

  const isService = item?.type === "SERVICE";
  const isBundle = item?.type === "BUNDLE";
  const totalStock =
    item?.stock?.reduce((sum, row) => sum + Number(row.quantity), 0) ?? 0;
  const stockValue = totalStock * Number(item?.averageCost ?? 0);
  const typeStyle =
    TYPE_STYLES[item?.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.PRODUCT;
  const TypeIcon = typeStyle.icon;
  const stockStatus = getStockStatus(
    totalStock,
    Number(item?.minStock ?? 0),
    Number(item?.reorderPoint ?? 0),
    {
      out: t("items.outOfStock"),
      below: t("items.belowMinimum"),
      reorder: t("items.reorderSoon"),
      in: t("items.inStock"),
    },
  );
  const StockIcon = stockStatus.icon;

  const typeLabel = item
    ? item.type === "SERVICE"
      ? t("items.types.SERVICE")
      : item.type === "BUNDLE"
        ? t("items.types.BUNDLE")
        : t("items.types.PRODUCT")
    : "";

  const extraUnits = item?.itemUoms ?? [];
  const bundleLines = item?.bundleLines ?? [];
  const dimensions = [item?.widthCm, item?.heightCm, item?.depthCm] as const;
  const hasDimensions = dimensions.some((value) => value != null);
  const hasLogistics = item?.weightKg != null || hasDimensions;
  const hasAccounts = Boolean(
    item?.revenueAccount || item?.cogsAccount || item?.inventoryAccount,
  );
  const counts = item?._count;
  const stockRows = (item?.stock ?? []) as unknown as Array<{
    quantity: unknown;
    warehouse: { id: string; name: string; isDefault: boolean };
  }>;

  return (
    <div className="@container flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b bg-background/95 px-2 backdrop-blur-md @sm:gap-2 @sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.back")}
          title={t("common.back")}
          onClick={goBack}
          className="size-8 shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        {item && (
          <span className="hidden size-7 shrink-0 items-center justify-center rounded-md border bg-muted/30 @sm:flex">
            <TypeIcon className="size-4 text-muted-foreground" />
          </span>
        )}
        <h1
          title={item?.name}
          className="min-w-0 flex-1 truncate text-sm font-semibold @md:text-base"
        >
          {item?.name ?? t("items.itemDetails")}
        </h1>
        {item && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEdit}
            aria-label={t("common.edit")}
            title={t("common.edit")}
            className="h-8 shrink-0 @lg:h-7"
          >
            <Edit className="size-3.5" />
            <span className="hidden @lg:inline">{t("common.edit")}</span>
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DetailsSkeleton />
        </div>
      ) : isError || !item ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty className="max-w-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t("common.failedToLoad")}</EmptyTitle>
              <EmptyDescription>{t("items.doesNotExist")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto w-full max-w-3xl space-y-3 p-3 @sm:space-y-4 @sm:p-4 @2xl:max-w-4xl">
            {/* Identity + at-a-glance numbers */}
            <Card size="sm" className="gap-0 py-0">
              <div className="flex flex-col gap-3 p-3 @xs:flex-row @xs:items-center @sm:gap-4 @sm:p-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 @md:size-20 @2xl:size-24">
                  {item.image && !imgError ? (
                    <img
                      key={item.image}
                      src={item.image}
                      alt={item.name}
                      className="size-full object-contain p-1"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <TypeIcon className="size-7 text-muted-foreground/50 @md:size-8" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={cn("gap-1", typeStyle.className)}>
                      <TypeIcon className="size-3" />
                      {typeLabel}
                    </Badge>
                    {!isService && (
                      <Badge className={cn("gap-1", stockStatus.className)}>
                        <StockIcon className="size-3" />
                        {stockStatus.label}
                      </Badge>
                    )}
                    {!item.isActive && (
                      <Badge variant="secondary">{t("common.inactive")}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Hash className="size-3 shrink-0" />
                      <span className="truncate font-mono text-[11px] text-foreground/80">
                        {item.sku}
                      </span>
                      <CopyButton value={item.sku} label="SKU" />
                    </span>
                    {item.barcode && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <ScanBarcode className="size-3 shrink-0" />
                        <span className="truncate font-mono text-[11px] text-foreground/80">
                          {item.barcode}
                        </span>
                        <CopyButton value={item.barcode} label="barcode" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-px border-t bg-border @xs:grid-cols-2 @xl:grid-cols-4">
                {isService ? (
                  <>
                    <StatTile
                      label={t("items.salesPrice")}
                      value={formatMoney(Number(item.salesPrice))}
                    />
                    <StatTile
                      label={t("items.avgCost")}
                      value={formatMoney(Number(item.averageCost))}
                    />
                    <StatTile
                      label={t("items.taxRate")}
                      value={
                        item.taxRate
                          ? `${Number(item.taxRate.rate)}%`
                          : t("items.noTaxRate")
                      }
                    />
                    <StatTile
                      label={t("items.unit")}
                      value={item.unit ?? "—"}
                    />
                  </>
                ) : (
                  <>
                    <StatTile
                      label={t("items.currentStock")}
                      value={`${formatQty(totalStock)} ${item.unit}`}
                    />
                    <StatTile
                      label={t("items.salesPrice")}
                      value={formatMoney(Number(item.salesPrice))}
                    />
                    <StatTile
                      label={t("items.avgCost")}
                      value={formatMoney(Number(item.averageCost))}
                    />
                    <StatTile
                      label={t("items.stockValue")}
                      value={formatMoney(stockValue)}
                    />
                  </>
                )}
              </dl>
            </Card>

            {/* Core attributes */}
            <Card size="sm" className="gap-0 py-0">
              <SectionHeading icon={Info} title={t("common.details")} />
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-3 @xs:grid-cols-2 @2xl:grid-cols-3">
                <Field
                  label={t("items.category")}
                  value={item.category?.name ?? "—"}
                />
                <Field
                  label={t("items.unit")}
                  value={
                    item.unitRef
                      ? `${item.unitRef.name} (${item.unitRef.code})`
                      : (item.unit ?? "—")
                  }
                />
                <Field
                  label={t("items.taxRate")}
                  value={
                    item.taxRate
                      ? `${item.taxRate.name} (${Number(item.taxRate.rate)}%)`
                      : t("items.noTaxRate")
                  }
                />
                <Field
                  label={t("items.saleable")}
                  value={<BooleanPill value={item.isSaleable} />}
                />
                <Field
                  label={t("items.purchasable")}
                  value={<BooleanPill value={item.isPurchasable} />}
                />
                <Field
                  label={t("items.itemId")}
                  value={
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-[11px]">
                        {item.id}
                      </span>
                      <CopyButton value={item.id} label="item ID" />
                    </span>
                  }
                />
              </dl>
            </Card>

            {/* Barcode */}
            {(item.barcode || !isService) && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={ScanBarcode}
                  title={t("items.barcode")}
                  action={
                    item.barcode ? (
                      <CopyButton value={item.barcode} label="barcode" />
                    ) : undefined
                  }
                />
                <div className="p-3">
                  {item.barcode ? (
                    <div
                      role="img"
                      aria-label={`Barcode ${item.barcode}`}
                      className="flex justify-center overflow-hidden rounded-lg border bg-white px-2 py-3 [&>svg]:h-auto [&>svg]:max-w-full"
                    >
                      <Barcode
                        value={item.barcode}
                        format="CODE128"
                        width={1.5}
                        height={64}
                        displayValue
                        font="monospace"
                        fontSize={11}
                        textMargin={4}
                        margin={0}
                        background="transparent"
                        lineColor="#000000"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                      <ScanBarcode className="size-4" />
                      {t("items.noBarcode")}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Stock, reorder settings and per-warehouse breakdown */}
            {!isService && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={Warehouse}
                  title={t("items.stock")}
                  action={
                    <Badge className={cn("gap-1", stockStatus.className)}>
                      <StockIcon className="size-3" />
                      {stockStatus.label}
                    </Badge>
                  }
                />
                <div className="space-y-3 p-3">
                  <dl className="grid grid-cols-2 gap-2 @xs:grid-cols-3">
                    <MiniStat
                      label={t("items.minimum")}
                      value={formatQty(item.minStock)}
                    />
                    <MiniStat
                      label={t("items.reorderAt")}
                      value={formatQty(item.reorderPoint)}
                    />
                    <MiniStat
                      label={t("items.reorderQty")}
                      value={formatQty(item.reorderQty)}
                    />
                  </dl>

                  <div>
                    <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t("items.perWarehouse")}
                    </p>
                    {stockRows.length > 0 ? (
                      <div className="grid gap-2 @lg:grid-cols-2">
                        {stockRows.map((row) => {
                          const quantity = Number(row.quantity);
                          return (
                            <div
                              key={row.warehouse.id}
                              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                            >
                              <span className="flex min-w-0 items-center gap-2 text-sm">
                                <Warehouse className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                  {row.warehouse.name}
                                </span>
                                {row.warehouse.isDefault && (
                                  <Badge
                                    variant="outline"
                                    className="hidden text-[10px] @sm:inline-flex"
                                  >
                                    {t("common.default")}
                                  </Badge>
                                )}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-sm font-semibold tabular-nums",
                                  quantity <= 0 && "text-destructive",
                                )}
                              >
                                {formatQty(quantity)} {item.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                        {t("items.noStockRecords")}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Alternative selling / purchasing units */}
            {extraUnits.length > 0 && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading icon={Layers} title={t("items.units")} />
                <div className="grid gap-2 p-3 @lg:grid-cols-2">
                  {extraUnits.map((uom) => (
                    <div key={uom.id} className="rounded-lg border px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {uom.unit.name}{" "}
                            <span className="font-mono text-xs text-muted-foreground">
                              ({uom.unit.code})
                            </span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            1 {uom.unit.code} = {formatQty(uom.factor)}{" "}
                            {item.unit}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {uom.isSalesDefault && (
                            <Badge variant="outline" className="text-[10px]">
                              {t("items.sales")}
                            </Badge>
                          )}
                          {uom.isPurchaseDefault && (
                            <Badge variant="outline" className="text-[10px]">
                              {t("items.purchase")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {uom.barcode && (
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                          {uom.barcode}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Bundle composition */}
            {isBundle && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={PackageOpen}
                  title={t("items.bundleComponents")}
                />
                <div className="p-3">
                  {bundleLines.length > 0 ? (
                    <div className="grid gap-2 @lg:grid-cols-2">
                      {bundleLines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium"
                              title={line.componentItem.name}
                            >
                              {line.componentItem.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {line.componentItem.sku}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatQty(line.quantity)} {line.componentItem.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                      {t("items.noBundleComponents")}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Supplier pricing */}
            {item.supplierItems?.length > 0 && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={ShoppingCart}
                  title={t("suppliers.itemsSupplied")}
                />
                <div className="grid gap-2 p-3 @lg:grid-cols-2">
                  {item.supplierItems.map((supplierItem) => {
                    const prices = supplierItem.prices ?? [];
                    return (
                      <div
                        key={supplierItem.id}
                        className="rounded-lg border px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium"
                              title={supplierItem.supplier?.name ?? undefined}
                            >
                              {supplierItem.supplier?.name ?? "—"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {supplierItem.supplierSku ?? "—"}
                              {supplierItem.leadTimeDays != null
                                ? ` · ${supplierItem.leadTimeDays} ${t("items.days")}`
                                : ""}
                              {" · "}
                              {t("items.minOrder")}{" "}
                              {formatQty(supplierItem.minOrderQty)} {item.unit}
                            </p>
                          </div>
                          <div className="shrink-0 text-end">
                            {prices.length > 0 ? (
                              prices.map((price) => (
                                <p
                                  key={price.unitId}
                                  className="text-xs font-semibold tabular-nums"
                                >
                                  {formatAmount(
                                    Number(price.price),
                                    supplierItem.currency,
                                  )}
                                  <span className="ms-0.5 text-[10px] font-normal text-muted-foreground">
                                    /{unitCodes.get(price.unitId) ?? item.unit}
                                  </span>
                                </p>
                              ))
                            ) : (
                              <p className="text-xs font-semibold tabular-nums">
                                {formatAmount(
                                  Number(supplierItem.basePrice),
                                  supplierItem.currency,
                                )}
                                <span className="ms-0.5 text-[10px] font-normal text-muted-foreground">
                                  /{item.unit}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Description */}
            {item.description && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={FileText}
                  title={t("items.description")}
                />
                <p className="max-w-prose p-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
                  {item.description}
                </p>
              </Card>
            )}

            {/* Logistics + GL overrides, only when configured */}
            {(hasLogistics || hasAccounts) && (
              <Card size="sm" className="gap-0 py-0">
                <SectionHeading
                  icon={Scale}
                  title={t("items.logisticsAccounting")}
                />
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-3 @xs:grid-cols-2 @2xl:grid-cols-3">
                  {item.weightKg != null && (
                    <Field
                      label={t("items.weight")}
                      value={`${formatQty(item.weightKg)} kg`}
                    />
                  )}
                  {hasDimensions && (
                    <Field
                      label={t("items.dimensions")}
                      value={`${dimensions
                        .map((value) =>
                          value == null ? "—" : formatQty(value),
                        )
                        .join(" × ")} cm`}
                    />
                  )}
                  {item.revenueAccount && (
                    <Field
                      label={t("items.revenueAccount")}
                      value={`${item.revenueAccount.code} · ${item.revenueAccount.name}`}
                    />
                  )}
                  {item.cogsAccount && (
                    <Field
                      label={t("items.cogsAccount")}
                      value={`${item.cogsAccount.code} · ${item.cogsAccount.name}`}
                    />
                  )}
                  {item.inventoryAccount && (
                    <Field
                      label={t("items.inventoryAccount")}
                      value={`${item.inventoryAccount.code} · ${item.inventoryAccount.name}`}
                    />
                  )}
                </dl>
              </Card>
            )}

            {/* Audit + usage, useful when reviewing whether an item is safe to change */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-1 text-[11px] text-muted-foreground">
              <span>
                {t("items.updated")} {formatDateTime(item.updatedAt)}
              </span>
              <span>
                {t("items.created")} {formatDateTime(item.createdAt)}
              </span>
              {counts && (
                <>
                  <span>
                    {counts.invoiceLines} {t("items.invoiceLines")}
                  </span>
                  <span>
                    {counts.purchaseLines} {t("items.poLines")}
                  </span>
                  <span>
                    {counts.stockMovements} {t("stock.movements").toLowerCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
