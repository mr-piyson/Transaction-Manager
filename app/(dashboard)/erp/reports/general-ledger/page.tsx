"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import {
  ReportCard,
  ReportDateFilter,
  ReportEmpty,
  ReportLayout,
  ReportPrintButton,
  ReportTable,
  ReportToolbar,
} from "@/components/reports";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function GeneralLedgerPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const accountSelectId = useId();
  const gridApiRef = useRef<GridApi | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: accounts, isLoading: accountsLoading } =
    trpc.settings.chartOfAccounts.list.useQuery();

  const queryParams = useMemo(
    () => ({
      accountId: selectedAccountId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }),
    [selectedAccountId, dateFrom, dateTo],
  );

  const { data, isLoading } = trpc.reports.generalLedger.useQuery(queryParams, {
    enabled: !!selectedAccountId,
  });

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "date",
        headerName: t("common.date"),
        width: 120,
        valueFormatter: (p) => (p.value ? formatShortDate(p.value) : "—"),
      },
      {
        field: "entryNumber",
        headerName: t("common.entryNumber"),
        width: 130,
        cellRenderer: (p: any) => (
          <span className="font-mono text-xs font-medium">{p.value}</span>
        ),
      },
      {
        field: "description",
        headerName: t("common.description"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "reference",
        headerName: t("common.reference"),
        width: 120,
        cellRenderer: (p: any) => (
          <span className="text-xs text-muted-foreground">
            {p.value || "—"}
          </span>
        ),
      },
      {
        field: "debit",
        headerName: t("reports.totalDebit"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : "—"),
        cellClass: "font-mono text-[11px] tabular-nums",
      },
      {
        field: "credit",
        headerName: t("reports.totalCredit"),
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : "—"),
        cellClass: "font-mono text-[11px] tabular-nums",
      },
      {
        field: "balance",
        headerName: t("reports.balance"),
        width: 140,
        type: "rightAligned",
        valueFormatter: (p) => format(p.value),
        cellClass: (p) =>
          cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            p.value >= 0 ? "text-success" : "text-destructive",
          ),
      },
    ],
    [format, formatShortDate, t],
  );

  const accountOptions = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter((account) => account.allowDirectPosting !== false)
      .map((account) => ({
        value: account.id,
        label: `${account.code} - ${account.name}`,
      }));
  }, [accounts]);

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
    if (dateFrom) return `${dateFrom} →`;
    if (dateTo) return `→ ${dateTo}`;
    return t("reports.allTime");
  }, [dateFrom, dateTo, t]);

  return (
    <ReportLayout
      title={t("reports.generalLedger")}
      description={t("reports.generalLedgerDescription")}
      period={periodLabel}
      icon={<BookOpen className="size-5" />}
      actions={
        <ReportPrintButton gridApiRef={gridApiRef} filename="general-ledger" />
      }
    >
      <ReportToolbar>
        <Field className="w-full gap-1.5 sm:w-[320px]">
          <FieldLabel
            htmlFor={accountSelectId}
            className="text-xs text-muted-foreground"
          >
            {t("common.account")}
          </FieldLabel>
          {accountsLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <Select
              items={accountOptions}
              value={selectedAccountId || null}
              onValueChange={(value) => setSelectedAccountId(value ?? "")}
            >
              <SelectTrigger id={accountSelectId} className="w-full">
                <SelectValue placeholder={t("reports.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <ReportDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
        />
      </ReportToolbar>

      {data?.account && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {data.account.code}
                </span>
                <span className="truncate font-semibold">
                  {data.account.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {data.account.type}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("reports.normalBalance")}: {data.account.normalBalance}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {t("reports.closingBalance")}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-lg font-semibold tabular-nums",
                  data.closingBalance >= 0
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {format(data.closingBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ReportCard
        title={t("reports.generalLedger")}
        description={
          selectedAccountId
            ? `${data?.transactions.length ?? 0} ${t("reports.transactions")} · ${periodLabel}`
            : t("reports.selectAccountToView")
        }
        icon={<BookOpen className="size-4" />}
        contentClassName="p-0"
        footer={
          data && data.transactions.length > 0 ? (
            <div className="flex w-full items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("reports.closingBalance")}
              </span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  data.closingBalance >= 0
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {format(data.closingBalance)}
              </span>
            </div>
          ) : null
        }
      >
        {!selectedAccountId ? (
          <ReportEmpty
            icon={<BookOpen />}
            title={t("reports.selectAccount")}
            description={t("reports.selectAccountToView")}
          />
        ) : isLoading ? (
          <div className="flex flex-col gap-2 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : data?.transactions.length === 0 ? (
          <ReportEmpty
            icon={<BookOpen />}
            title={t("reports.noTransactions")}
            description={t("reports.generalLedgerDescription")}
          />
        ) : (
          <ReportTable
            rowData={data?.transactions ?? []}
            columnDefs={columnDefs}
            gridApiRef={gridApiRef}
            getRowId={(params) => params.data.entryNumber}
          />
        )}
      </ReportCard>
    </ReportLayout>
  );
}
