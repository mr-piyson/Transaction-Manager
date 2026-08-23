"use client";

import { ArrowLeft, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";

type DetailPageHeaderProps = {
	title: React.ReactNode;
	icon: LucideIcon;
	badges?: React.ReactNode;
	actions?: React.ReactNode;
	onBack: () => void;
	backLabel: string;
};

/**
 * A consistent, compact app bar for ERP record detail pages.
 *
 * The title area shrinks before the action area so mobile controls remain
 * reachable and long record names never push actions off-screen.
 */
export function DetailPageHeader({
	title,
	icon: Icon,
	badges,
	actions,
	onBack,
	backLabel,
}: DetailPageHeaderProps) {
	return (
		<header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur-md">
			<Button
				variant="ghost"
				size="icon"
				aria-label={backLabel}
				onClick={onBack}
			>
				<ArrowLeft className="size-5" />
			</Button>
			<span
				aria-hidden="true"
				className="hidden text-muted-foreground sm:inline"
			>
				|
			</span>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Icon className="size-5 shrink-0 text-muted-foreground" />
				<h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
				{badges && (
					<div className="flex shrink-0 items-center gap-1">{badges}</div>
				)}
			</div>
			{actions && (
				<div className="flex shrink-0 items-center gap-1">{actions}</div>
			)}
		</header>
	);
}
