"use client";
import { Button } from "@/components/button";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Printer, Download, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function InvoicePrintPageEnhanced() {
  const { invoiceId, recordId } = useParams();
  const router = useRouter();

  // Fetch all data
  const { data: invoiceItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["invoicesItems", invoiceId],
    queryFn: async () => (await axios.get(`/api/records/${recordId}/invoices/${invoiceId}`)).data || [],
  });

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => (await axios.get(`/api/invoices/${invoiceId}`)).data,
  });

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["record", recordId],
    queryFn: async () => (await axios.get(`/api/records/${recordId}`)).data,
  });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company"],
    queryFn: async () => (await axios.get(`/api/companies/1`)).data,
  });

  const isLoading = itemsLoading || invoiceLoading || customerLoading || companyLoading;

  // Calculations
  const totals = Array.isArray(invoiceItems)
    ? invoiceItems.reduce(
        (acc: any, item: any) => {
          const lineSubtotal = item.amount * item.qty;
          return {
            subtotal: acc.subtotal + lineSubtotal,
            discount: acc.discount + (item.discount || 0),
            tax: acc.tax + (item.tax || 0),
            total: acc.total + (lineSubtotal - (item.discount || 0) + (item.tax || 0)),
          };
        },
        { subtotal: 0, discount: 0, tax: 0, total: 0 },
      )
    : { subtotal: 0, discount: 0, tax: 0, total: 0 };

  const currency = company?.defaultCurrency || invoiceItems[0]?.currency || "BD";
  const formatMoney = (val: number) => val.toFixed(3);
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Print Styles */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

        * {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .invoice-page {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            box-shadow: none;
            page-break-after: avoid;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }

        @media screen {
          body {
            background: #e5e7eb;
          }

          .invoice-page {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 hover:bg-gray-100">
            <ArrowLeft className="size-4" />
            Back to Invoice
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="size-4" />
              Print Invoice
            </Button>
            <Button variant="default" onClick={handlePrint} className="gap-2">
              <Download className="size-4" />
              Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* A4 Invoice */}
      <div className="min-h-screen pt-20 pb-12 px-4 print:p-0 print:pt-0">
        <div className="invoice-page max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          {/* Content Wrapper with Padding */}
          <div className="h-full flex flex-col p-16">
            {/* Header Section */}
            <div className="flex justify-between items-start pb-10 border-b-2 border-gray-900">
              {/* Company Info */}
              <div className="flex-1">
                {company?.logo ? (
                  <img src={company.logo} alt="Company Logo" className="h-14 w-auto mb-5 object-contain" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">{company?.name || "Your Company"}</div>
                )}
                <div className="text-xs text-gray-600 space-y-1.5 max-w-xs">
                  {company?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-3.5 mt-0.5 shrink-0 text-gray-400" />
                      <span>{company.address}</span>
                    </div>
                  )}
                  {company?.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-gray-400" />
                      <span>{company.telephone}</span>
                    </div>
                  )}
                  {company?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0 text-gray-400" />
                      <span>{company.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Title & Details */}
              <div className="text-right">
                <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">INVOICE</h1>
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-md">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Invoice Number</div>
                  <div className="text-lg font-bold text-gray-900">#{String(invoiceId).padStart(5, "0")}</div>
                </div>
              </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div className="grid grid-cols-2 gap-12 py-10 border-b border-gray-200">
              {/* Bill To */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bill To</div>
                <div className="space-y-1.5">
                  <div className="text-base font-semibold text-gray-900">{customer?.name || "Customer Name"}</div>
                  {customer?.code && <div className="text-sm text-gray-600">Customer ID: {customer.code}</div>}
                  {customer?.address && <div className="text-sm text-gray-600">{customer.address}</div>}
                  <div className="pt-2 space-y-1">
                    {customer?.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="size-3.5 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer?.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="size-3.5 text-gray-400" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Info */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Invoice Details</div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Issue Date:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(invoice?.date)}</span>
                  </div>
                  {invoice?.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          invoice.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : invoice.status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {invoice.status.replace("_", " ")}
                      </span>
                    </div>
                  )}
                  {invoice?.title && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Reference:</span>
                      <span className="text-sm font-medium text-gray-900">{invoice.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 py-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-12">#</th>
                    <th className="text-left py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">Item Description</th>
                    <th className="text-center py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-20">Type</th>
                    <th className="text-right py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-16">Qty</th>
                    <th className="text-right py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-24">Price</th>
                    <th className="text-right py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-24">Discount</th>
                    <th className="text-right py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-20">Tax</th>
                    <th className="text-right py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(invoiceItems) &&
                    invoiceItems.map((item: any, idx: number) => {
                      const lineTotal = item.amount * item.qty - (item.discount || 0) + (item.tax || 0);
                      return (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-4 text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-4">
                            <div className="font-medium text-gray-900">{item.title}</div>
                            {item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}
                          </td>
                          <td className="py-4 text-center">
                            <span className="inline-block text-[10px] font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded uppercase">{item.type}</span>
                          </td>
                          <td className="py-4 text-right text-gray-700 font-medium">{item.qty}</td>
                          <td className="py-4 text-right text-gray-700">
                            {formatMoney(item.amount)} <span className="text-xs text-gray-500">{currency}</span>
                          </td>
                          <td className="py-4 text-right">
                            {item.discount ? (
                              <span className="text-red-600 font-medium">
                                -{formatMoney(item.discount)} <span className="text-xs">{currency}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            {item.tax ? (
                              <span className="text-gray-700">
                                {formatMoney(item.tax)} <span className="text-xs text-gray-500">{currency}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-4 text-right font-semibold text-gray-900">
                            {formatMoney(lineTotal)} <span className="text-xs text-gray-500">{currency}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="border-t-2 border-gray-900 pt-6">
              <div className="flex justify-end">
                <div className="w-96 space-y-3">
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      {formatMoney(totals.subtotal)} {currency}
                    </span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm py-2">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-red-600">
                        -{formatMoney(totals.discount)} {currency}
                      </span>
                    </div>
                  )}
                  {totals.tax > 0 && (
                    <div className="flex justify-between text-sm py-2">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium text-gray-900">
                        +{formatMoney(totals.tax)} {currency}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-900 pt-3 mt-2">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatMoney(totals.total)} <span className="text-base">{currency}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-8 mt-8 text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">Thank you for your business!</p>
              <p className="text-xs text-gray-500">For any questions regarding this invoice, please contact {company?.email || "us"}.</p>
              <p className="text-xs text-gray-400 mt-4">This is a computer-generated document. No signature required.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
