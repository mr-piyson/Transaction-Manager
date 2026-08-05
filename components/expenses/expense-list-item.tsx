import { Wallet } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/use-currency";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn } from "@/lib/utils";

interface ExpenseListItemProps extends HTMLAttributes<HTMLDivElement> {
	data?: any;
}

export function ExpenseListItem({
	data,
	className,
	...props
}: ExpenseListItemProps) {
	const { formatDate } = useDateFormat();
	const { format } = useCurrency();
	const { description, category, method, date, reference, amount } = data || {};

	return (
		<div className={cn("flex items-center gap-3 h-18", className)} {...props}>
			<div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
				<Wallet className="size-5 text-muted-foreground" />
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<p className="font-semibold truncate">{description}</p>
					{category && <Badge variant="secondary">{category.name}</Badge>}
				</div>
				<p className="text-sm text-muted-foreground truncate">
					{method ?? "—"} · {date ? formatDate(date) : "—"}
					{reference ? ` · ${reference}` : ""}
				</p>
			</div>
			<div className="text-right">
				<p className="font-semibold tabular-nums">{format(amount)}</p>
			</div>
		</div>
	);
}
