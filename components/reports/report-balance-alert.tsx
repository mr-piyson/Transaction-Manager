"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ReportBalanceAlertProps {
  balanced: boolean;
  title: string;
  description?: string;
  className?: string;
}

/** Consistent balanced/unbalanced callout for the accounting reports. */
export function ReportBalanceAlert({
  balanced,
  title,
  description,
  className,
}: ReportBalanceAlertProps) {
  return (
    <Alert
      variant={balanced ? "default" : "destructive"}
      className={cn(
        "items-center",
        balanced &&
          "border-success/30 bg-success/5 text-success *:data-[slot=alert-description]:text-success/80",
        className,
      )}
    >
      {balanced ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <AlertCircle aria-hidden="true" />
      )}
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
}
