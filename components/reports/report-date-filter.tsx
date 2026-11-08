"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ReportDateFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClear: () => void;
  description?: string;
}

interface DatePreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

function inputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangePresets(t: ReturnType<typeof useTranslations>): DatePreset[] {
  const now = new Date();
  const today = inputDate(now);
  return [
    {
      id: "allTime",
      label: t("reports.allTime"),
      from: "",
      to: "",
    },
    {
      id: "thisMonth",
      label: t("reports.thisMonth"),
      from: inputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: today,
    },
    {
      id: "lastMonth",
      label: t("reports.lastMonth"),
      from: inputDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: inputDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    },
    {
      id: "last30Days",
      label: t("reports.last30Days"),
      from: inputDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
      ),
      to: today,
    },
    {
      id: "thisYear",
      label: t("reports.thisYear"),
      from: inputDate(new Date(now.getFullYear(), 0, 1)),
      to: today,
    },
  ];
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
  const fromId = useId();
  const toId = useId();
  const presets = rangePresets(t);
  const activePreset = presets.find(
    (preset) =>
      preset.from === (dateFrom ?? "") && preset.to === (dateTo ?? ""),
  )?.id;
  const hasFilter = Boolean(dateFrom || dateTo);

  const applyPreset = (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    onDateFromChange(preset.from);
    onDateToChange(preset.to);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t("reports.dateRange")}
        </span>
        <ToggleGroup
          value={activePreset ? [activePreset] : []}
          onValueChange={(values) => {
            const next = values[0];
            if (next) applyPreset(next);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="flex-wrap"
        >
          {presets.map((preset) => (
            <ToggleGroupItem key={preset.id} value={preset.id}>
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-[150px] gap-1.5">
          <FieldLabel
            htmlFor={fromId}
            className="text-xs text-muted-foreground"
          >
            {t("common.from")}
          </FieldLabel>
          <Input
            id={fromId}
            type="date"
            value={dateFrom ?? ""}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-8"
          />
        </Field>
        <Field className="w-[150px] gap-1.5">
          <FieldLabel htmlFor={toId} className="text-xs text-muted-foreground">
            {t("common.to")}
          </FieldLabel>
          <Input
            id={toId}
            type="date"
            value={dateTo ?? ""}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-8"
          />
        </Field>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X data-icon="inline-start" />
            {t("common.clear")}
          </Button>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
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
  const dateId = useId();
  const now = new Date();
  const presets: DatePreset[] = [
    {
      id: "today",
      label: t("reports.today"),
      from: inputDate(now),
      to: inputDate(now),
    },
    {
      id: "lastMonth",
      label: t("reports.lastMonth"),
      from: inputDate(new Date(now.getFullYear(), now.getMonth(), 0)),
      to: inputDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    },
    {
      id: "lastQuarter",
      label: t("reports.lastQuarter"),
      from: inputDate(
        new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0),
      ),
      to: inputDate(
        new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0),
      ),
    },
    {
      id: "lastYear",
      label: t("reports.lastYear"),
      from: inputDate(new Date(now.getFullYear() - 1, 11, 31)),
      to: inputDate(new Date(now.getFullYear() - 1, 11, 31)),
    },
  ];
  const activePreset = presets.find(
    (preset) => preset.from === (asOfDate ?? ""),
  )?.id;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label ?? t("reports.asOf")}
        </span>
        <ToggleGroup
          value={activePreset ? [activePreset] : []}
          onValueChange={(values) => {
            const next = values[0];
            if (next) {
              const preset = presets.find((item) => item.id === next);
              if (preset) onDateChange(preset.from);
            }
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="flex-wrap"
        >
          {presets.map((preset) => (
            <ToggleGroupItem key={preset.id} value={preset.id}>
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-[170px] gap-1.5">
          <FieldLabel
            htmlFor={dateId}
            className="text-xs text-muted-foreground"
          >
            {t("common.date")}
          </FieldLabel>
          <Input
            id={dateId}
            type="date"
            value={asOfDate ?? ""}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-8"
          />
        </Field>
        {asOfDate && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X data-icon="inline-start" />
            {t("common.clear")}
          </Button>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
