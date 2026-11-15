"use client";

import { ArrowDown, ArrowUp, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiVariant = "default" | "success" | "danger" | "warning" | "info";

const variantStyles: Record<KpiVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export interface ReportKpiFormula {
  /** Optional caption, e.g. "Gross margin". */
  label?: string;
  /** Human-readable expression, e.g. "Revenue − COGS". */
  expression: string;
  inputs?: { label: string; value: string }[];
  result: string;
}

export interface ReportKpiExplanation {
  description?: string;
  /** Where the number comes from: tables, statuses and filters. */
  source: string;
  formulas?: ReportKpiFormula[];
  /** Result shown when the metric is a plain count/aggregate with no formula. */
  result?: string;
  labels: {
    about: string;
    dataSource: string;
    formula: string;
    result: string;
  };
}

interface ReportKpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  variant?: KpiVariant;
  loading?: boolean;
  countLabel?: string;
  sub?: string;
  trend?: { dir: "up" | "down"; label: string };
  explanation?: ReportKpiExplanation;
  className?: string;
}

/**
 * Compact KPI tile used across every report so the numbers read the same way.
 */
export function ReportKpiCard({
  title,
  value,
  icon,
  variant = "default",
  loading,
  countLabel,
  sub,
  trend,
  explanation,
  className,
}: ReportKpiCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "relative overflow-hidden transition-shadow hover:ring-foreground/20",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {title}
            </p>
            {explanation && (
              <HoverCard>
                <HoverCardTrigger
                  delay={150}
                  closeDelay={100}
                  render={
                    <button
                      type="button"
                      aria-label={explanation.labels.about}
                      className="mt-px inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Info className="size-3" aria-hidden="true" />
                    </button>
                  }
                />
                <HoverCardContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="w-80 max-w-[calc(100vw-2rem)] p-3 text-xs"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold">{title}</p>
                      {explanation.description && (
                        <p className="leading-relaxed text-muted-foreground">
                          {explanation.description}
                        </p>
                      )}
                    </div>

                    <div className="border-t pt-2.5">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {explanation.labels.dataSource}
                      </p>
                      <p className="mt-1 leading-relaxed">
                        {explanation.source}
                      </p>
                    </div>

                    {explanation.formulas?.length ? (
                      explanation.formulas.map((formula, index) => (
                        <div
                          key={`${formula.label ?? "formula"}-${index}`}
                          className="border-t pt-2.5"
                        >
                          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            {explanation.labels.formula}
                          </p>
                          {formula.label && (
                            <p className="mt-1 font-medium">{formula.label}</p>
                          )}
                          <p className="mt-1 rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] leading-relaxed">
                            {formula.expression}
                          </p>
                          {formula.inputs && formula.inputs.length > 0 && (
                            <dl className="mt-2 flex flex-col gap-1">
                              {formula.inputs.map((input) => (
                                <div
                                  key={input.label}
                                  className="flex items-baseline justify-between gap-3"
                                >
                                  <dt className="text-muted-foreground">
                                    {input.label}
                                  </dt>
                                  <dd className="font-medium tabular-nums">
                                    {input.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          <div className="mt-2 flex items-baseline justify-between gap-3 border-t pt-1.5">
                            <span className="font-medium">
                              {explanation.labels.result}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {formula.result}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border-t pt-2.5">
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {explanation.labels.result}
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">
                          {explanation.result ?? value}
                        </p>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
          <div
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              variantStyles[variant],
            )}
          >
            {icon}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <p className="text-xl leading-tight font-semibold tracking-tight tabular-nums sm:text-2xl">
              {value}
            </p>
            {countLabel && (
              <p className="text-xs text-muted-foreground">{countLabel}</p>
            )}
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            {trend && (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trend.dir === "up" ? "text-success" : "text-destructive",
                )}
              >
                {trend.dir === "up" ? (
                  <ArrowUp className="size-3" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-3" aria-hidden="true" />
                )}
                {trend.label}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
