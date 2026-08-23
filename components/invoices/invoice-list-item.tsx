import { Receipt } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  INVOICED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

interface InvoiceListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function InvoiceListItem({
  data,
  className,
  ...props
}: InvoiceListItemProps) {
  const { formatDate } = useDateFormat();
  const { serial, status, customer, date, total, currency } = data || {};

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-3",
        className,
      )}
      {...props}
    >
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Receipt className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{serial}</p>
          <Badge variant="outline" className={STATUS_COLORS[status] ?? ""}>
            {status?.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="col-span-3 min-w-0 text-left text-sm text-muted-foreground truncate sm:col-span-1 sm:col-start-2 sm:row-start-2">
          {customer?.name ?? "—"} · {date ? formatDate(date) : "—"}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">
          {Number(total).toFixed(3)} {currency}
        </p>
      </div>
    </div>
  );
}
