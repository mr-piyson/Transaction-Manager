"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import {
  ReportCard,
  ReportDateFilter,
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

export default function ProfitAndLossPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const gridApiRef = useRef<GridApi | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = useMemo(
    () => ({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }),
    [dateFrom, dateTo],
  );

  const { data, isLoading } = trpc.reports.profitAndLoss.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];
    const rows: any[] = [];

    data.revenue.forEach((account) => {
      rows.push({
        id: `rev-${account.code}`,
        section: "revenue",
        code: account.code,
        name: account.name,
        amount: account.balance,
        isSubtotal: false,
      });
    });

    if (data.revenue.length > 0) {
      rows.push({
        id: "rev-total",
        section: "revenue",
        code: "",
        name: t("reports.totalRevenue"),
        amount: data.totalRevenue,
        isSubtotal: true,
      });
    }

    data.expenses.forEach((account) => {
      rows.push({
        id: `exp-${account.code}`,
        section: "expense",
        code: account.code,
        name: account.name,
        amount: -account.balance,
        isSubtotal: false,
      });
    });

    if (data.expenses.length > 0) {
      rows.push({
        id: "exp-total",
        section: "expense",
        code: "",
        name: t("reports.totalExpenses"),
        amount: -data.totalExpenses,
        isSubtotal: true,
      });
    }

    rows.push({
      id: "net-income",
      section: "summary",
      code: "",
      name: t("reports.netIncome"),
      amount: data.netIncome,
      isSubtotal: true,
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
        cellClass: (p) => cn(p.data?.isSubtotal && "font-semibold"),
      },
      {
        field: "amount",
        headerName: t("common.amount"),
        width: 150,
        type: "rightAligned",
        valueFormatter: (p) => format(p.value),
        cellClass: (p) =>
          cn(
            "font-mono text-[11px] tabular-nums",
            p.data?.isSubtotal && "font-bold",
            p.value < 0 ? "text-destructive" : "text-success",
          ),
      },
    ],
    [format, t],
  );

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
    if (dateFrom) return `${dateFrom} →`;
    if (dateTo) return `→ ${dateTo}`;
    return t("reports.allTime");
  }, [dateFrom, dateTo, t]);

  return (
    <ReportLayout
      title={t("reports.profitAndLoss")}
      description={t("reports.profitAndLossDescription")}
      period={periodLabel}
      icon={<TrendingUp className="size-5" />}
      actions={
        <ReportPrintButton gridApiRef={gridApiRef} filename="profit-and-loss" />
      }
    >
      <ReportToolbar>
        <ReportDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
          description={t("reports.profitAndLossDescription")}
        />
      </ReportToolbar>

      <section
        aria-label={t("reports.profitAndLoss")}
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <ReportKpiCard
          title={t("reports.totalRevenue")}
          value={data ? format(data.totalRevenue) : "-"}
          icon={<TrendingUp className="size-4" />}
          variant="success"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.totalExpenses")}
          value={data ? format(data.totalExpenses) : "-"}
          icon={<Wallet className="size-4" />}
          variant="danger"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.netIncome")}
          value={data ? format(data.netIncome) : "-"}
          icon={<TrendingUp className="size-4" />}
          variant={data && data.netIncome >= 0 ? "success" : "danger"}
          loading={isLoading}
        />
      </section>

      <ReportCard
        title={t("reports.profitAndLoss")}
        description={periodLabel}
        icon={<TrendingUp className="size-4" />}
        contentClassName="p-0"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.revenue.length === 0 && data.expenses.length === 0 ? (
          <ReportEmpty
            icon={<TrendingUp />}
            title={t("reports.noData")}
            description={t("reports.profitAndLossDescription")}
          />
        ) : (
          <ReportTable
            rowData={rowData}
            columnDefs={columnDefs}
            gridApiRef={gridApiRef}
            getRowId={(params) => params.data.id}
            getRowClass={(params) =>
              params.data.isSubtotal ? "font-semibold bg-muted/50" : ""
            }
          />
        )}
      </ReportCard>

      {data && (data.revenue.length > 0 || data.expenses.length > 0) && (
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reports.netIncome")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.revenue.length} {t("reports.revenueAccounts")} ·{" "}
                {data.expenses.length} {t("reports.expenseAccounts")}
              </p>
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                data.netIncome >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {format(data.netIncome)}
            </p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
