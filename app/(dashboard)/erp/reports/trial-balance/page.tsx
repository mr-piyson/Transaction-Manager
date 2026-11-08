"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { Scale } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function TrialBalancePage() {
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

  const { data, isLoading } = trpc.reports.trialBalance.useQuery(queryParams);

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
      },
      {
        field: "type",
        headerName: t("common.type"),
        width: 120,
        cellRenderer: (p: any) => (
          <Badge variant="outline" className="h-5 text-[10px]">
            {p.value}
          </Badge>
        ),
      },
      {
        field: "normalBalance",
        headerName: t("reports.normalBalance"),
        width: 110,
        cellRenderer: (p: any) => (
          <span className="text-xs font-medium text-muted-foreground">
            {p.value}
          </span>
        ),
      },
      {
        field: "totalDebit",
        headerName: t("reports.totalDebit"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : "—"),
        cellClass: "font-mono text-[11px] tabular-nums",
      },
      {
        field: "totalCredit",
        headerName: t("reports.totalCredit"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : "—"),
        cellClass: "font-mono text-[11px] tabular-nums",
      },
      {
        field: "balance",
        headerName: t("reports.balance"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => format(p.value),
        cellClass: (p) =>
          cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            p.value >= 0 ? "text-success" : "text-destructive",
          ),
      },
    ],
    [format, t],
  );

  const period = asOfDate
    ? `${t("reports.asOf")} ${asOfDate}`
    : t("reports.currentDate");
  const difference = data ? Math.abs(data.totalDebit - data.totalCredit) : 0;

  return (
    <ReportLayout
      title={t("reports.trialBalance")}
      description={t("reports.trialBalanceDescription")}
      period={period}
      icon={<Scale className="size-5" />}
      actions={
        <ReportPrintButton gridApiRef={gridApiRef} filename="trial-balance" />
      }
    >
      <ReportToolbar>
        <ReportAsOfFilter
          asOfDate={asOfDate}
          onDateChange={setAsOfDate}
          onClear={() => setAsOfDate("")}
          description={t("reports.trialBalanceDescription")}
        />
      </ReportToolbar>

      {data && (
        <ReportBalanceAlert
          balanced={data.isBalanced}
          title={
            data.isBalanced
              ? t("reports.trialBalanced")
              : t("reports.trialUnbalanced")
          }
          description={`${t("reports.difference")}: ${format(difference)}`}
        />
      )}

      <section
        aria-label={t("reports.trialBalance")}
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <ReportKpiCard
          title={t("reports.totalDebit")}
          value={data ? format(data.totalDebit) : "-"}
          icon={<Scale className="size-4" />}
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.totalCredit")}
          value={data ? format(data.totalCredit) : "-"}
          icon={<Scale className="size-4" />}
          loading={isLoading}
        />
        <ReportKpiCard
          title={t("reports.difference")}
          value={data ? format(difference) : "-"}
          icon={<Scale className="size-4" />}
          variant={data?.isBalanced ? "success" : "danger"}
          loading={isLoading}
        />
      </section>

      <ReportCard
        title={t("reports.trialBalance")}
        description={`${period} · ${data?.accounts.length ?? 0} ${t("reports.accounts")}`}
        icon={<Scale className="size-4" />}
        contentClassName="p-0"
        footer={
          data ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t("reports.totalDebit")}:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {format(data.totalDebit)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("reports.totalCredit")}:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {format(data.totalCredit)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("reports.difference")}:{" "}
                <span
                  className={cn(
                    "font-mono font-semibold",
                    data.isBalanced ? "text-success" : "text-destructive",
                  )}
                >
                  {format(difference)}
                </span>
              </span>
            </div>
          ) : null
        }
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (data?.accounts.length ?? 0) === 0 ? (
          <ReportEmpty
            icon={<Scale />}
            title={t("reports.noData")}
            description={t("reports.trialBalanceDescription")}
          />
        ) : (
          <ReportTable
            rowData={data?.accounts ?? []}
            columnDefs={columnDefs}
            gridApiRef={gridApiRef}
            getRowId={(params) => params.data.accountId}
          />
        )}
      </ReportCard>
    </ReportLayout>
  );
}
