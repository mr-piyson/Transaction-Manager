"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

interface ReportKpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  variant?: KpiVariant;
  loading?: boolean;
  countLabel?: string;
  sub?: string;
  trend?: { dir: "up" | "down"; label: string };
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
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </p>
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
