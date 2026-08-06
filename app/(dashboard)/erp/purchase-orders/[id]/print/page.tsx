"use client";

import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDateFormat } from "@/hooks/use-date-format";
import { downloadElementAsPdf } from "@/lib/pdf-download";
import { trpc } from "@/lib/trpc/client";

const STATUS_STYLES: Record<string, string> = {
	DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
	PENDING_APPROVAL: "bg-yellow-50 text-yellow-800 border-yellow-300",
	APPROVED: "bg-blue-50 text-blue-800 border-blue-300",
	ORDERED: "bg-indigo-50 text-indigo-800 border-indigo-300",
	PARTIAL_RECEIVED: "bg-purple-50 text-purple-800 border-purple-300",
	RECEIVED: "bg-green-50 text-green-800 border-green-300",
	INVOICED: "bg-teal-50 text-teal-800 border-teal-300",
	CANCELLED: "bg-red-50 text-red-800 border-red-300",
	CLOSED: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function PurchaseOrderPrintPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const t = useTranslations();
	const { formatDate } = useDateFormat();

	const {
		data: po,
		isLoading,
		isError,
	} = trpc.purchaseOrders.byId.useQuery(
		{ id: params.id },
		{ enabled: !!params.id },
	);

	const { data: org } = trpc.organizations.get.useQuery();

	const [printing, setPrinting] = React.useState(false);
	const [downloading, setDownloading] = React.useState(false);
	const documentRef = React.useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		setPrinting(true);
		setTimeout(() => {
			window.print();
			setPrinting(false);
		}, 100);
	};

	const handleDownloadPdf = async () => {
		if (!documentRef.current) return;
		setDownloading(true);
		try {
			await downloadElementAsPdf(
				documentRef.current,
				`${po.serial}.pdf`,
			);
		} finally {
			setDownloading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Spinner className="size-8 text-primary" />
			</div>
		);
	}

	if (isError || !po) {
		return (
			<div className="flex items-center justify-center h-screen">
				<p className="text-muted-foreground">
					{t("purchaseOrders.doesNotExist")}
				</p>
			</div>
		);
	}

	const lines = po.lines ?? [];
	const hasPayments = (po.payments?.length ?? 0) > 0;
	const backHref = `/erp/purchase-orders/${po.id}`;

	return (
		<div className="min-h-screen bg-muted/30 print:bg-white">
			{/* Toolbar — hidden when printing */}
			<div className="sticky top-0 z-50 flex items-center gap-1.5 sm:gap-2 border-b bg-background px-2 sm:px-4 py-2 print:hidden">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push(backHref)}
				>
					<ArrowLeft className="size-5" />
				</Button>
				<span className="text-sm text-muted-foreground hidden sm:inline">|</span>
				<span className="text-sm font-medium truncate flex-1 min-w-0">
					{po.serial} — {t("purchaseOrders.title")}
				</span>
				<Button onClick={handlePrint} disabled={printing} size="sm">
					{printing ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Printer className="size-4" />
					)}
					<span className="hidden sm:inline ml-1">{t("common.print")}</span>
				</Button>
				<Button onClick={handleDownloadPdf} disabled={downloading} variant="outline" size="sm">
					{downloading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Download className="size-4" />
					)}
					<span className="hidden sm:inline ml-1">{t("common.downloadPdf")}</span>
				</Button>
			</div>

			{/* Document — always light theme regardless of system theme */}
			<div
				ref={documentRef}
				className="mx-auto max-w-[210mm] bg-white shadow-sm print:shadow-none print:mx-0 print:max-w-none print:p-[15mm_10mm]"
				style={
					{
						colorScheme: "light",
						color: "var(--foreground)",
						"--background": "#ffffff",
						"--foreground": "#17141d",
						"--muted": "#dddddd",
						"--muted-foreground": "#606060",
						"--border": "#cccccc",
						"--primary": "#2c2742",
						"--primary-foreground": "#fbfbfb",
						"--destructive": "#a82b2b",
					} as React.CSSProperties
				}
			>
				{/* Header */}
				<div className="flex items-start justify-between px-8 pt-8 pb-4 border-b print:px-6 print:pt-6">
					<div className="flex items-start gap-4">
						{org?.logo && (
							<img
								src={org.logo}
								alt={org.name}
								className="size-16 object-contain rounded"
							/>
						)}
						<div>
							<h1 className="text-2xl font-bold">{org?.name ?? ""}</h1>
							{org?.crNumber && (
								<p className="text-xs text-muted-foreground">
									{t("customers.crNumber")}: {org.crNumber}
								</p>
							)}
							{org?.taxId && (
								<p className="text-xs text-muted-foreground">
									{t("customers.taxId")}: {org.taxId}
								</p>
							)}
							{org?.vatRegistered && (
								<p className="text-xs text-muted-foreground">
									{t("common.vatRegistered")}
								</p>
							)}
							{org?.phone && (
								<p className="text-xs text-muted-foreground">{org.phone}</p>
							)}
							{org?.email && (
								<p className="text-xs text-muted-foreground">{org.email}</p>
							)}
							{org?.website && (
								<p className="text-xs text-muted-foreground">{org.website}</p>
							)}
						</div>
					</div>
					<div className="text-right">
						<h2 className="text-xl font-bold uppercase tracking-wide">
							{t("purchaseOrders.title")}
						</h2>
						<p className="text-sm font-semibold mt-1">{po.serial}</p>
						<div className="mt-2 text-xs text-muted-foreground">
							<p>
								{t("common.date")}: {po.date ? formatDate(po.date) : "—"}
							</p>
							{po.expectedDate && (
								<p>
									{t("purchaseOrders.expectedDate")}:{" "}
									{formatDate(po.expectedDate)}
								</p>
							)}
						</div>
						<div className="mt-2">
							<span
								className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_STYLES[po.status] ?? "bg-gray-100 text-gray-800 border-gray-300"}`}
							>
								{t(`purchaseOrders.statuses.${po.status}`)}
							</span>
						</div>
					</div>
				</div>

				{/* Supplier & Warehouse Info */}
				<div className="grid grid-cols-2 gap-8 px-8 py-4 border-b print:px-6">
					<div>
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
							{t("purchaseOrders.supplier")}
						</h3>
						<p className="font-semibold">{po.supplier?.name ?? "—"}</p>
						{po.supplier?.email && (
							<p className="text-sm text-muted-foreground">
								{po.supplier.email}
							</p>
						)}
						{po.supplier?.phone && (
							<p className="text-sm text-muted-foreground">
								{po.supplier.phone}
							</p>
						)}
					</div>
					<div>
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
							{t("purchaseOrders.warehouse")}
						</h3>
						<p className="font-semibold">{po.warehouse?.name ?? "—"}</p>
						{po.department && (
							<>
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-2">
									{t("common.department")}
								</h3>
								<p className="font-semibold">{po.department.name}</p>
							</>
						)}
					</div>
				</div>

				{/* Description */}
				{po.notes && (
					<div className="px-8 py-3 border-b text-sm text-muted-foreground print:px-6">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
							{t("common.notes")}
						</h3>
						<p className="whitespace-pre-wrap">{po.notes}</p>
					</div>
				)}

				{/* Line items */}
				<div className="px-8 py-4 print:px-6">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-xs text-muted-foreground uppercase">
								<th className="text-left py-2 pr-2 w-10">#</th>
								<th className="text-left py-2 pr-2">{t("common.item")}</th>
								<th className="text-right py-2 px-2">{t("common.quantity")}</th>
								<th className="text-right py-2 px-2">
									{t("purchaseOrders.unitCost")}
								</th>
								<th className="text-right py-2 px-2">{t("common.tax")} %</th>
								<th className="text-right py-2 px-2">{t("common.tax")}</th>
								<th className="text-right py-2 pl-2">{t("common.total")}</th>
							</tr>
						</thead>
						<tbody>
							{lines.map((line: any, idx: number) => (
								<tr key={line.id} className="border-b last:border-0">
									<td className="py-2 pr-2 text-muted-foreground align-top">
										{idx + 1}
									</td>
									<td className="py-2 pr-2 align-top">
										<span className="font-medium">
											{line.item?.name ?? "—"}
										</span>
										{line.item?.sku && (
											<p className="text-xs text-muted-foreground">
												SKU: {line.item.sku}
											</p>
										)}
										{line.description && (
											<p className="text-xs text-muted-foreground">
												{line.description}
											</p>
										)}
									</td>
									<td className="py-2 px-2 text-right align-top whitespace-nowrap">
										{Number(line.quantity).toFixed(3)}
										{Number(line.receivedQty) > 0 && (
											<span className="text-xs text-green-600 ml-1">
												(✓ {Number(line.receivedQty).toFixed(0)})
											</span>
										)}
									</td>
									<td className="py-2 px-2 text-right align-top whitespace-nowrap">
										{Number(line.unitCost).toFixed(3)}
									</td>
									<td className="py-2 px-2 text-right align-top whitespace-nowrap">
										{line.taxRateSnapshot ? (
											<span>{Number(line.taxRateSnapshot)}%</span>
										) : (
											"—"
										)}
									</td>
									<td className="py-2 px-2 text-right align-top whitespace-nowrap">
										{line.taxRateName ? (
											<span>{Number(line.taxAmt).toFixed(3)}</span>
										) : (
											"—"
										)}
									</td>
									<td className="py-2 pl-2 text-right align-top whitespace-nowrap font-medium">
										{Number(line.total).toFixed(3)}
									</td>
								</tr>
							))}
							{lines.length === 0 && (
								<tr>
									<td
										colSpan={7}
										className="py-6 text-center text-muted-foreground"
									>
										{t("purchaseOrders.noLineItems")}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Totals */}
				<div className="px-8 pb-4 print:px-6">
					<div className="ml-auto w-64 space-y-1 text-sm border-t pt-2">
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{t("common.subtotal")}
							</span>
							<span>{Number(po.subtotal).toFixed(3)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">{t("common.tax")}</span>
							<span>{Number(po.taxTotal).toFixed(3)}</span>
						</div>
						<div className="flex justify-between font-bold text-base border-t pt-1">
							<span>{t("common.total")}</span>
							<span>
								{Number(po.total).toFixed(3)} {po.currency}
							</span>
						</div>
						{Number(po.amountPaid) > 0 && (
							<div className="flex justify-between text-green-700 font-medium">
								<span>{t("common.paid")}</span>
								<span>-{Number(po.amountPaid).toFixed(3)}</span>
							</div>
						)}
						{Number(po.amountOwed) > 0 && (
							<div className="flex justify-between text-red-600 font-medium">
								<span>{t("purchaseOrders.amountOwed")}</span>
								<span>
									{Number(po.amountOwed).toFixed(3)} {po.currency}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Internal Notes */}
				{po.internalNotes && (
					<div className="px-8 py-3 border-t print:px-6">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
							{t("common.internalNotes")}
						</h3>
						<p className="text-sm whitespace-pre-wrap">{po.internalNotes}</p>
					</div>
				)}

				{/* Payments table */}
				{hasPayments && (
					<div className="px-8 py-3 border-t print:px-6">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
							{t("common.payments")}
						</h3>
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-xs text-muted-foreground">
									<th className="text-left py-1 pr-2">{t("common.date")}</th>
									<th className="text-left py-1 pr-2">{t("common.method")}</th>
									<th className="text-right py-1 pl-2">{t("common.amount")}</th>
									<th className="text-left py-1 pl-2">
										{t("common.reference")}
									</th>
								</tr>
							</thead>
							<tbody>
								{po.payments.map((p: any) => (
									<tr key={p.id}>
										<td className="py-1 pr-2">{formatDate(p.date)}</td>
										<td className="py-1 pr-2">{p.method}</td>
										<td className="py-1 pl-2 text-right">
											{Number(p.amount).toFixed(3)}
										</td>
										<td className="py-1 pl-2 text-muted-foreground">
											{p.reference ?? "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Footer */}
				{(org?.invoiceFooter || org?.stampImage) && (
					<div className="border-t mt-4 px-8 py-3 text-xs text-muted-foreground print:px-6">
						<div className="flex items-start justify-between">
							<p className="whitespace-pre-wrap">{org.invoiceFooter}</p>
							{org.stampImage && (
								<img
									src={org.stampImage}
									alt={t("invoices.stamp")}
									className="size-20 object-contain ml-4 shrink-0"
								/>
							)}
						</div>
					</div>
				)}
			</div>

			<style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body {
            background: white !important;
            color: #17141d !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
		</div>
	);
}
