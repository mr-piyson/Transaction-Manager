"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportToolbarProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Filter/action strip shared by every report. */
export function ReportToolbar({
  children,
  actions,
  className,
}: ReportToolbarProps) {
  return (
    <Card size="sm" className={cn("print:hidden", className)}>
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          {children}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
