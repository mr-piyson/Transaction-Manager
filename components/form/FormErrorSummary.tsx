"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface FlatFormError {
  path: string;
  message: string;
}

export function flattenFieldErrors(
  errors: Record<string, any> | undefined,
  prefix = "",
): FlatFormError[] {
  if (!errors) return [];

  const result: FlatFormError[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;

    // `root` holds form-level / server errors that RHF attaches outside fields
    if (key === "root") {
      result.push(...flattenFieldErrors(value?.server ?? value, prefix));
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value.message === "string") {
      if (value.message) result.push({ path, message: value.message });
      continue;
    }

    if (value?.type) continue;

    if (typeof value === "object") {
      result.push(...flattenFieldErrors(value, path));
    }
  }
  return result;
}

interface FormErrorSummaryProps {
  errors: Record<string, any> | undefined;
  submitError?: string | null;
  className?: string;
}

export function FormErrorSummary({
  errors,
  submitError,
  className,
}: FormErrorSummaryProps) {
  const t = useTranslations();

  const fieldErrors = flattenFieldErrors(errors);
  const all = [
    ...fieldErrors.map((e) => ({ key: e.path, message: e.message })),
    ...(submitError ? [{ key: "submit", message: submitError }] : []),
  ];

  if (all.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{t("invoices.fixFollowing")}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
          {all.map((e) => (
            <li key={e.key}>{e.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
