"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logger";

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  context?: string;
}

interface FormErrorBoundaryState {
  hasError: boolean;
  requestId?: string;
}

export class FormErrorBoundary extends React.Component<
  FormErrorBoundaryProps,
  FormErrorBoundaryState
> {
  state: FormErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Partial<FormErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const requestId = logError(this.props.context ?? "form", error, {
      componentStack: info.componentStack,
    });
    this.setState({ requestId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          requestId={this.state.requestId}
          onReset={() =>
            this.setState({ hasError: false, requestId: undefined })
          }
        />
      );
    }
    return this.props.children;
  }
}

function ErrorBoundaryFallback({
  requestId,
  onReset,
}: {
  requestId?: string;
  onReset: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="size-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">{t("errors.generic")}</h2>
      {requestId && (
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          {requestId}
        </p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" onClick={onReset}>
          {t("common.retry")}
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("common.refresh")}
        </Button>
      </div>
    </div>
  );
}
