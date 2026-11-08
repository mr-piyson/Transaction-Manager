"use client";

import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface ReportEmptyProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty state for reports with no rows for the selection. */
export function ReportEmpty({
  icon,
  title,
  description,
  action,
  className,
}: ReportEmptyProps) {
  return (
    <Empty
      className={cn(
        "border border-dashed border-border bg-card/40 py-12",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
