"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { Landmark, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import {
  ReportAsOfFilter,
  ReportBalanceAlert,
  ReportCard,
  ReportEmpty,
  ReportKpiCard,
  ReportLayout,
  ReportPrintButton,
  ReportTable,
  ReportToolbar,
} from "@/components/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function BalanceSheetPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const gridApiRef = useRef<GridApi | null>(null);

  const [asOfDate, setAsOfDate] = useState("");

  const queryParams = useMemo(
    () => ({
      asOf: asOfDate ? new Date(asOfDate) : undefined,
    }),
    [asOfDate],
  );

  const { data, isLoading } = trpc.reports.balanceSheet.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];
    const rows: any[] = [];

    if (data.assets.length > 0) {
      rows.push({
        id: "section-assets",
        section: "assets",
        code: "",
        name: t("reports.totalAssets"),
        amount: null,
        isSection: true,
      });
      data.assets.forEach((account) => {
        rows.push({
          id: `asset-${account.code}`,
          section: "assets",
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: "total-assets",
        section: "assets",
        code: "",
        name: t("reports.totalAssets"),
        amount: data.totalAssets,
        isTotal: true,
      });
    }

    if (data.liabilities.length > 0) {
      rows.push({
        id: "section-liabilities",
        section: "liabilities",
        code: "",
        name: t("reports.totalLiabilities"),
        amount: null,
        isSection: true,
      });
      data.liabilities.forEach((account) => {
        rows.push({
          id: `liability-${account.code}`,
          section: "liabilities",
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: "total-liabilities",
        section: "liabilities",
        code: "",
        name: t("reports.totalLiabilities"),
        amount: data.totalLiabilities,
        isTotal: true,
      });
    }

    if (data.equity.length > 0) {
      rows.push({
        id: "section-equity",
        section: "equity",
        code: "",
        name: t("reports.totalEquity"),
        amount: null,
        isSection: true,
      });
      data.equity.forEach((account) => {
        rows.push({
          id: `equity-${account.code}`,
          section: "equity",
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: "total-equity",
        section: "equity",
        code: "",
        name: t("reports.totalEquity"),
        amount: data.totalEquity,
        isTotal: true,
      });
    }

    rows.push({
      id: "grand-total",
      section: "summary",
      code: "",
      name: `${t("reports.totalLiabilities")} + ${t("reports.totalEquity")}`,
      amount: data.totalLiabilities + data.totalEquity,
      isGrandTotal: true,
    });

    return rows;
  }, [data, t]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "code",
        headerName: t("common.code"),
        width: 100,
        cellClass: "font-mono text-[11px]",
      },
      {
        field: "name",
        headerName: t("common.name"),
        flex: 1,
        minWidth: 200,
        cellClass: (p) =>
          cn(
            p.data?.isSection && "font-bold uppercase text-xs tracking-wider",
            (p.data?.isTotal || p.data?.isGrandTotal) && "font-bold",
          ),
      },
      {
        field: "amount",
        headerName: t("common.amount"),
        width: 150,
        type: "rightAligned",
        valueFormatter: (p) => (p.value != null ? format(p.value) : ""),
        cellClass: (p) =>
          cn(
            "font-mono text-[11px] tabular-nums",
            p.data?.isTotal && "font-bold border-t border-border",
            p.data?.isGrandTotal && "font-bold border-t-2 border-primary",
            !p.data?.isSection &&
              !p.data?.isTotal &&
              !p.data?.isGrandTotal &&
              (p.value < 0 ? "text-destructive" : "text-success"),
          ),
      },
    ],
    [format, t],
  );

  const difference = data
    ? Math.abs(data.totalAssets - data.totalLiabilities - data.totalEquity)
    : 0;
  const period = asOfDate
    ? `${t("reports.asOf")} ${asOfDate}`
    : t("reports.currentDate");

  return (
    <ReportLayout
      title={t("reports.balanceSheet")}
      description={t("reports.balanceSheetDescription")}
      period={period}
      icon={<Landmark className="size-5" />}
      actions={
        <ReportPrintButton gridApiRef={gridApiRef} filename="balance-sheet" />
      }
    >
      <ReportToolbar>
        <ReportAsOfFilter
          asOfDate={asOfDate}
          onDateChange={setAsOfDate}
          onClear={() => setAsOfDate("")}
          description={t("reports.balanceSheetDescription")}
        />
      </ReportToolbar>

      {data && (
        <ReportBalanceAlert
          balanced={data.isBalanced}
          title={
            data.isBalanced ? t("reports.balanced") : t("reports.unbalanced")
          }
          description={
            data.isBalanced
              ? `${format(data.totalAssets)} = ${format(data.totalLiabilities)} + ${format(data.totalEquity)}`
              : `${t("reports.difference")}: ${format(difference)}`
          }
        />
      )}

      <section
        aria-label={t("reports.balanceSheet")}
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <ReportKpiCard
          title={t("reports.totalAssets")}
          value={data ? format(data.totalAssets) : "-"}
          icon={<Scale className="size-4" />}
          variant="success"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.totalLiabilities")}
          value={data ? format(data.totalLiabilities) : "-"}
          icon={<Landmark className="size-4" />}
          variant="danger"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.totalEquity")}
          value={data ? format(data.totalEquity) : "-"}
          icon={<Scale className="size-4" />}
          loading={isLoading}
        />
      </section>

      <ReportCard
        title={t("reports.balanceSheet")}
        description={period}
        icon={<Landmark className="size-4" />}
        contentClassName="p-0"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : rowData.length === 0 ? (
          <ReportEmpty
            icon={<Landmark />}
            title={t("reports.noData")}
            description={t("reports.balanceSheetDescription")}
          />
        ) : (
          <ReportTable
            rowData={rowData}
            columnDefs={columnDefs}
            gridApiRef={gridApiRef}
            getRowId={(params) => params.data.id}
            getRowClass={(params) => {
              if (params.data.isGrandTotal) return "font-bold bg-primary/5";
              if (params.data.isTotal) return "font-semibold bg-muted/30";
              if (params.data.isSection) return "font-bold bg-muted/20";
              return "";
            }}
          />
        )}
      </ReportCard>

      {data && (
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <div className="rounded-lg bg-success/5 p-3 ring-1 ring-success/20">
              <p className="text-xs text-muted-foreground">
                {t("reports.totalAssets")}
              </p>
              <p className="mt-1 text-lg font-semibold text-success tabular-nums">
                {format(data.totalAssets)}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="hidden text-center text-xl font-semibold text-muted-foreground sm:block"
            >
              =
            </span>
            <div className="rounded-lg bg-destructive/5 p-3 ring-1 ring-destructive/20">
              <p className="text-xs text-muted-foreground">
                {t("reports.totalLiabilities")}
              </p>
              <p className="mt-1 text-lg font-semibold text-destructive tabular-nums">
                {format(data.totalLiabilities)}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="hidden text-center text-xl font-semibold text-muted-foreground sm:block"
            >
              +
            </span>
            <div className="rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
              <p className="text-xs text-muted-foreground">
                {t("reports.totalEquity")}
              </p>
              <p className="mt-1 text-lg font-semibold text-primary tabular-nums">
                {format(data.totalEquity)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
