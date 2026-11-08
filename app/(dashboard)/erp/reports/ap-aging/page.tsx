"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { Clock, FileDown, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ReportCard,
  ReportEmpty,
  ReportKpiCard,
  ReportLayout,
  ReportPrintButton,
  ReportTable,
} from "@/components/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const BUCKET_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(0 70% 50%)",
];

const BUCKET_KEYS = [
  "agingCurrent",
  "aging1to30",
  "aging31to60",
  "aging61to90",
  "aging90plus",
] as const;

export default function APAgingPage() {
  const t = useTranslations();
  const router = useRouter();
  const { format } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const gridApiRef = useRef<GridApi | null>(null);

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data, isLoading } = trpc.reports.apAgingDetailed.useQuery();

  const bucketLabels = useMemo(
    () => BUCKET_KEYS.map((key) => t(`reports.${key}`)),
    [t],
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map((bucket, index) => ({
      bucket: bucketLabels[index] ?? bucket.bucket,
      rawBucket: bucket.bucket,
      amount: Math.round(bucket.amount),
      count: bucket.count,
    }));
  }, [data, bucketLabels]);

  const selectedBucketData = useMemo(() => {
    if (!data || !selectedBucket) return null;
    return data.buckets.find((bucket) => bucket.bucket === selectedBucket);
  }, [data, selectedBucket]);

  const poList = useMemo(() => {
    if (selectedBucketData) return selectedBucketData.pos;
    if (!data) return [];
    return data.buckets.flatMap((bucket) => bucket.pos);
  }, [data, selectedBucketData]);

  const selectedBucketLabel = useMemo(() => {
    if (!selectedBucket) return null;
    const index = data?.buckets.findIndex(
      (bucket) => bucket.bucket === selectedBucket,
    );
    return index !== undefined && index >= 0
      ? bucketLabels[index]
      : selectedBucket;
  }, [bucketLabels, data, selectedBucket]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "serial",
        headerName: t("common.serial"),
        width: 140,
        cellRenderer: (p: any) => (
          <span className="text-sm font-medium">{p.value}</span>
        ),
      },
      {
        field: "supplierName",
        headerName: t("common.supplier"),
        flex: 1,
        minWidth: 150,
      },
      {
        field: "total",
        headerName: t("common.total"),
        width: 120,
        type: "rightAligned",
        valueFormatter: (p) => format(p.value),
        cellClass: "font-mono text-[11px] tabular-nums",
      },
      {
        field: "amountOwed",
        headerName: t("invoices.outstanding"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => format(p.value),
        cellClass: "font-mono text-[11px] font-semibold tabular-nums",
      },
      {
        field: "dueDate",
        headerName: t("common.dueDate"),
        width: 120,
        valueFormatter: (p) => (p.value ? formatShortDate(p.value) : "—"),
        cellClass: (p) => {
          if (!p.value) return "";
          const days = Math.floor(
            (Date.now() - new Date(p.value).getTime()) / (1000 * 60 * 60 * 24),
          );
          if (days > 90) return "text-destructive font-bold";
          if (days > 60) return "text-destructive";
          if (days > 30) return "text-warning";
          return "";
        },
      },
      {
        field: "daysOverdue",
        headerName: t("reports.daysOverdue"),
        width: 120,
        type: "rightAligned",
        cellRenderer: (p: any) => {
          if (p.value <= 0) {
            return (
              <Badge variant="outline" className="h-5 text-[10px]">
                {t("reports.agingCurrent")}
              </Badge>
            );
          }
          const variant =
            p.value > 60
              ? "destructive"
              : p.value > 30
                ? "default"
                : "secondary";
          return (
            <Badge variant={variant} className="h-5 text-[10px]">
              {p.value} {t("common.days")}
            </Badge>
          );
        },
      },
    ],
    [format, formatShortDate, t],
  );

  const chartConfig = useMemo(
    () => ({ amount: { label: t("common.amount") } }),
    [t],
  );

  const hasOutstanding = (data?.grandTotal ?? 0) > 0;

  return (
    <ReportLayout
      title={t("reports.apAging")}
      description={t("reports.apAgingDescription")}
      period={t("reports.currentDate")}
      icon={<Clock className="size-5" />}
      actions={
        <ReportPrintButton gridApiRef={gridApiRef} filename="ap-aging" />
      }
    >
      <section
        aria-label={t("reports.apAging")}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {isLoading
          ? BUCKET_KEYS.map((key) => (
              <ReportKpiCard
                key={key}
                title={t(`reports.${key}`)}
                value="-"
                icon={<Clock className="size-4" />}
                loading
              />
            ))
          : data?.buckets.map((bucket, index) => (
              <ReportKpiCard
                key={bucket.bucket}
                title={bucketLabels[index] ?? bucket.bucket}
                value={format(bucket.amount)}
                countLabel={t("reports.poCount", { count: bucket.count })}
                icon={<Clock className="size-4" />}
                variant={
                  index === 0 ? "default" : index <= 2 ? "warning" : "danger"
                }
              />
            ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReportCard
          className="lg:col-span-2"
          title={t("reports.apAging")}
          description={t("reports.apAgingDescription")}
          icon={<Truck className="size-4" />}
        >
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !hasOutstanding ? (
            <ReportEmpty
              icon={<Truck />}
              title={t("reports.noOutstandingPayables")}
              description={t("reports.noOutstandingPayablesDesc")}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/erp/purchase-orders")}
                >
                  {t("reports.purchaseOrders")}
                </Button>
              }
            />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[300px] w-full"
            >
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                onClick={(next: any) => {
                  const rawBucket =
                    next?.activePayload?.[0]?.payload?.rawBucket;
                  if (!rawBucket) return;
                  setSelectedBucket(
                    selectedBucket === rawBucket ? null : rawBucket,
                  );
                }}
              >
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value: any) => format(Number(value))}
                    />
                  }
                />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? `${(value / 1000).toFixed(0)}K`
                      : String(value)
                  }
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.rawBucket}
                      fill={BUCKET_COLORS[index]}
                      fillOpacity={
                        selectedBucket === null ||
                        selectedBucket === entry.rawBucket
                          ? 1
                          : 0.3
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ReportCard>

        <ReportCard
          title={t("common.summary")}
          description={t("reports.totalOutstanding")}
          icon={<Clock className="size-4" />}
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {BUCKET_KEYS.map((key) => (
                <Skeleton key={key} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data?.buckets.map((bucket, index) => (
                <button
                  type="button"
                  key={bucket.bucket}
                  aria-pressed={selectedBucket === bucket.bucket}
                  onClick={() =>
                    setSelectedBucket(
                      selectedBucket === bucket.bucket ? null : bucket.bucket,
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedBucket === bucket.bucket
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {bucketLabels[index] ?? bucket.bucket}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("reports.poCount", { count: bucket.count })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {format(bucket.amount)}
                  </span>
                </button>
              ))}

              <Separator className="my-1" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("reports.totalPOs")}
                </span>
                <span className="font-semibold tabular-nums">
                  {data?.totalCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("reports.totalOutstanding")}
                </span>
                <span className="text-base font-semibold text-destructive tabular-nums">
                  {data ? format(data.grandTotal) : "—"}
                </span>
              </div>
            </div>
          )}
        </ReportCard>
      </section>

      <ReportCard
        title={
          selectedBucketLabel
            ? `${selectedBucketLabel} · ${t("reports.purchaseOrders")}`
            : t("reports.purchaseOrders")
        }
        description={`${poList.length} ${t("reports.outstandingPOs")}`}
        icon={<FileDown className="size-4" />}
        action={
          selectedBucket ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBucket(null)}
            >
              {t("common.clear")}
            </Button>
          ) : null
        }
        contentClassName="p-0"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : poList.length === 0 ? (
          <ReportEmpty
            icon={<Truck />}
            title={t("reports.noOutstandingPayables")}
            description={t("reports.noOutstandingPayablesDesc")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/erp/purchase-orders")}
              >
                {t("reports.purchaseOrders")}
              </Button>
            }
          />
        ) : (
          <ReportTable
            rowData={poList}
            columnDefs={columnDefs}
            gridApiRef={gridApiRef}
            getRowId={(params) => params.data.id}
            onRowClicked={(params) =>
              router.push(`/erp/purchase-orders/${params.data.id}`)
            }
            getRowClass={() => "cursor-pointer"}
          />
        )}
      </ReportCard>
    </ReportLayout>
  );
}
