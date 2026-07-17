'use client';

import { Printer, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';
import type { GridApi } from 'ag-grid-community';

interface ReportPrintButtonProps {
  gridApiRef?: React.RefObject<GridApi | null>;
  title?: string;
  filename?: string;
  showExport?: boolean;
  className?: string;
}

export function ReportPrintButton({
  gridApiRef,
  title,
  filename,
  showExport = true,
  className,
}: ReportPrintButtonProps) {
  const t = useTranslations();

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    gridApiRef?.current?.exportDataAsCsv({ fileName: filename ?? 'report' });
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1 print:hidden"
        onClick={handlePrint}
      >
        <Printer className="size-3.5" />
        {t('common.print')}
      </Button>
      {showExport && gridApiRef && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1 print:hidden"
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          {t('common.export')}
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
      className={`text-xs gap-1 print:hidden ${className ?? ''}`}
      onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: filename })}
    >
      <Download className="size-3.5" />
      {t('common.export')}
    </Button>
  );
}
