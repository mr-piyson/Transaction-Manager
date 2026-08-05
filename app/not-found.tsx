"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
	const t = useTranslations();

	return (
		<div className="flex min-h-screen items-center justify-center p-6">
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<FileQuestion className="size-6" />
					</EmptyMedia>
					<EmptyTitle>{t("common.notFound")}</EmptyTitle>
					<EmptyDescription>
						The page you are looking for does not exist or has been moved.
					</EmptyDescription>
				</EmptyHeader>
				<Button asChild>
					<Link href="/">{t("common.goBack")}</Link>
				</Button>
			</Empty>
		</div>
	);
}
