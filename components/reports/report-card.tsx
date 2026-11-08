"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Card with a consistent header used for charts, summaries and tables. */
export function ReportCard({
  title,
  description,
  icon,
  action,
  children,
  footer,
  className,
  contentClassName,
}: ReportCardProps) {
  return (
    <Card className={cn("print:shadow-none", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon && (
            <span aria-hidden="true" className="text-muted-foreground">
              {icon}
            </span>
          )}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
