"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/App-Header";
import { cn } from "@/lib/utils";

interface ReportLayoutProps {
  title: string;
  description?: string;
  period?: string;
  icon: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** @deprecated use actions */
  rightContent?: ReactNode;
  className?: string;
}

/**
 * Shared shell for every report page.
 *
 * The app bar carries the title and actions; the content column keeps a
 * consistent rhythm and shows a plain print header (the app bar is hidden
 * when printing).
 */
export function ReportLayout({
  title,
  description,
  period,
  icon,
  actions,
  children,
  rightContent,
  className,
}: ReportLayoutProps) {
  const headerActions = actions ?? rightContent;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-10 print:min-h-0 print:pb-0">
      <Header
        title={title}
        subtitle={description}
        icon={icon}
        className="print:hidden"
      >
        {period && (
          <span className="hidden text-xs text-muted-foreground md:inline">
            {period}
          </span>
        )}
        {headerActions}
      </Header>

      <main
        className={cn(
          "mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-4 lg:gap-6 lg:p-8 print:gap-3 print:p-0",
          className,
        )}
      >
        <div className="hidden print:block">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {(description || period) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[description, period].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
