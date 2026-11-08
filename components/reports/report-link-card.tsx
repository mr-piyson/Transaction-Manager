"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneStyles = {
  "1": "bg-chart-1/10 text-chart-1",
  "2": "bg-chart-2/10 text-chart-2",
  "3": "bg-chart-3/10 text-chart-3",
  "4": "bg-chart-4/10 text-chart-4",
  "5": "bg-chart-5/10 text-chart-5",
} as const;

interface ReportLinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: keyof typeof toneStyles;
}

/** Navigable report tile used on the reports hub. */
export function ReportLinkCard({
  href,
  title,
  description,
  icon,
  tone = "1",
}: ReportLinkCardProps) {
  return (
    <Link href={href} className="group block h-full rounded-xl">
      <Card className="h-full transition-colors group-hover:ring-foreground/25">
        <CardContent className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              toneStyles[tone],
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
