"use client";

import type { GridApi } from "ag-grid-community";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportPrintButtonProps {
  gridApiRef?: React.RefObject<GridApi | null>;
  filename?: string;
  showExport?: boolean;
  className?: string;
}

export function ReportPrintButton({
  gridApiRef,
  filename,
  showExport = true,
  className,
}: ReportPrintButtonProps) {
  const t = useTranslations();

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    gridApiRef?.current?.exportDataAsCsv({ fileName: filename ?? "report" });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="print:hidden"
        aria-label={t("common.print")}
        onClick={handlePrint}
      >
        <Printer data-icon="inline-start" />
        <span className="hidden sm:inline">{t("common.print")}</span>
      </Button>
      {showExport && gridApiRef && (
        <Button
          variant="outline"
          size="sm"
          className="print:hidden"
          aria-label={t("common.export")}
          onClick={handleExport}
        >
          <Download data-icon="inline-start" />
          <span className="hidden sm:inline">{t("common.export")}</span>
        </Button>
      )}
    </div>
  );
}

interface ReportCsvExportButtonProps {
  gridApiRef: React.RefObject<GridApi | null>;
  filename: string;
  className?: string;
}

export function ReportCsvExportButton({
  gridApiRef,
  filename,
  className,
}: ReportCsvExportButtonProps) {
  const t = useTranslations();

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("print:hidden", className)}
      onClick={() =>
        gridApiRef.current?.exportDataAsCsv({ fileName: filename })
      }
    >
      <Download data-icon="inline-start" />
      {t("common.export")}
    </Button>
  );
}
