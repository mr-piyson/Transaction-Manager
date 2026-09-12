"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { FormErrorBoundary } from "@/components/form/FormErrorBoundary";
import { FormErrorSummary } from "@/components/form/FormErrorSummary";
import { Button } from "@/components/ui/button";

interface FormPageScaffoldProps {
  context?: string;
  title: string;
  subtitle?: string;
  backHref: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  submitLabel: string;
  errors?: Record<string, any>;
  submitError?: string | null;
  children: React.ReactNode;
  contentClassName?: string;
  pageClassName?: string;
}

/**
 * Shared full-page form frame used by create/edit route pages:
 * back header, error summary, scrollable body, sticky mobile submit footer.
 */
export function FormPageScaffold({
  context = "form",
  title,
  subtitle,
  backHref,
  onSubmit,
  isPending,
  submitLabel,
  errors,
  submitError,
  children,
  contentClassName = "max-w-4xl",
  pageClassName = "",
}: FormPageScaffoldProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <FormErrorBoundary context={context}>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex h-full min-w-0 flex-col"
      >
        <header className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="-ms-1">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {subtitle}
              </p>
            )}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => router.push(backHref)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${pageClassName}`}>
          <div
            className={`mx-auto w-full space-y-4 px-4 py-6 sm:px-6 ${contentClassName}`}
          >
            <FormErrorSummary errors={errors} submitError={submitError} />
            {children}
          </div>
        </div>

        <footer className="sticky bottom-0 border-t bg-background p-3 sm:hidden">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </footer>
      </form>
    </FormErrorBoundary>
  );
}
