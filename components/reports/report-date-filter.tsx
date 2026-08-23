"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "../ui/label";

interface ReportDateFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClear: () => void;
  description?: string;
}

export function ReportDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  description,
}: ReportDateFilterProps) {
  const t = useTranslations();
  const hasFilter = dateFrom || dateTo;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {t("common.from")}
            </Label>
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {t("common.to")}
            </Label>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-1"
            >
              <X className="size-3" />
              {t("common.clear")}
            </Button>
          )}
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ReportAsOfFilterProps {
  asOfDate?: string;
  onDateChange: (value: string) => void;
  onClear: () => void;
  label?: string;
  description?: string;
}

export function ReportAsOfFilter({
  asOfDate,
  onDateChange,
  onClear,
  label,
  description,
}: ReportAsOfFilterProps) {
  const t = useTranslations();
  const hasFilter = !!asOfDate;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {label ?? t("reports.asOf")}
            </Label>
            <input
              type="date"
              value={asOfDate ?? ""}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-1"
            >
              <X className="size-3" />
              {t("common.clear")}
            </Button>
          )}
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
