"use client";

import { ArrowLeft, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { DetailPageHeader } from "@/components/detail-page-header";
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
  /** When set, renders the DetailPageHeader style instead of the default header */
  icon?: LucideIcon;
  /** Badges to show in the header (status, payment status, etc.) */
  badges?: React.ReactNode;
  /** Action buttons (dropdown menu) to show in the header */
  actions?: React.ReactNode;
  /** Whether the form has unsaved changes (warns on back navigation) */
  isDirty?: boolean;
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
  icon,
  badges,
  actions,
  isDirty = false,
}: FormPageScaffoldProps) {
  const t = useTranslations();
  const router = useRouter();

  const handleBack = () => {
    if (
      isDirty &&
      !window.confirm(t("invoices.unsavedChangesWarning" as any))
    ) {
      return;
    }
    router.push(backHref);
  };

  return (
    <FormErrorBoundary context={context}>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex h-full min-w-0 flex-col"
      >
        {icon ? (
          <DetailPageHeader
            title={title}
            icon={icon}
            onBack={handleBack}
            backLabel={t("common.back")}
            badges={badges}
            actions={
              <div className="flex items-center gap-2">
                {actions}
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {submitLabel}
                </Button>
              </div>
            }
          />
        ) : (
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
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </header>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto ${pageClassName}`}>
          <div
            className={`mx-auto w-full space-y-4 px-4 py-6 sm:px-6 ${contentClassName}`}
          >
            <FormErrorSummary errors={errors} submitError={submitError} />
            {children}
          </div>
        </div>
      </form>
    </FormErrorBoundary>
  );
}
