"use client";

import type { GridApi } from "ag-grid-community";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
