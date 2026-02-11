"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, Loader2 } from "lucide-react";

// Types based on Prisma schema
type InvoiceWithRelations = {
  id: number;
  title: string | null;
  total: number | null;
  status: "IN_PROGRESS" | "PENDING" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  date: string | null;
  customerId: string | null;
  createdAt: string | null;
  records: {
    id: number;
    name: string | null;
    email: string | null;
    code: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  invoiceItems: Array<{
    id: number;
    title: string;
    description: string | null;
    qty: number;
    amount: number;
    charge: number | null;
    discount: number | null;
    tax: number | null;
    currency: string | null;
    type: "SERVICE" | "PRODUCT";
  }>;
};

type CompanyData = {
  id: number;
  name: string | null;
  address: string | null;
  telephone: string | null;
  logo: string | null;
  email: string | null;
  vat: string | null;
  defaultCurrency: string | null;
};

type InvoiceResponse = {
  invoice: InvoiceWithRelations;
  company: CompanyData;
};

export default function InvoicePage() {
  const { recordId, invoiceId } = useParams();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  const { data, error, isLoading } = useSWR<InvoiceResponse>(`/api/records/${recordId}/invoices/${invoiceId}/invoice`, {
    fetcher: (url: string) => fetch(url).then(res => res.json()),
  });

  // Calculate scale for mobile devices
  useEffect(() => {
    const calculateScale = () => {
      const viewportWidth = window.innerWidth;
      const a4WidthMm = 210;
      const mmToPx = 3.7795275591; // 1mm = 3.78px at 96 DPI
      const a4WidthPx = a4WidthMm * mmToPx;

      // Add padding for mobile
      const availableWidth = viewportWidth - 32; // 16px padding on each side

      if (viewportWidth < 768) {
        // Mobile: scale down to fit
        const newScale = availableWidth / a4WidthPx;
        setScale(Math.min(newScale, 1));
      } else if (viewportWidth < 1024) {
        // Tablet: slight scale down if needed
        const newScale = availableWidth / a4WidthPx;
        setScale(Math.min(newScale, 0.9));
      } else {
        // Desktop: full size
        setScale(1);
      }
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);

    try {
      // Temporarily set scale to 1 for PDF generation
      const currentTransform = invoiceRef.current.style.transform;
      invoiceRef.current.style.transform = "scale(1)";
      invoiceRef.current.style.transformOrigin = "top left";

      // Wait for transform to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get all pages
      const pages = invoiceRef.current.querySelectorAll(".invoice-page");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`invoice-${data?.invoice.id}.pdf`);

      // Restore original transform
      invoiceRef.current.style.transform = currentTransform;
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    // Temporarily reset scale for printing
    const currentTransform = invoiceRef.current.style.transform;
    invoiceRef.current.style.transform = "scale(1)";

    // Print after a short delay to ensure transform is applied
    setTimeout(() => {
      window.print();
      // Restore transform after print dialog
      setTimeout(() => {
        if (invoiceRef.current) {
          invoiceRef.current.style.transform = currentTransform;
        }
      }, 100);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">Error loading invoice data</div>
      </div>
    );
  }

  const { invoice, company } = data;
  const currency = company.defaultCurrency || "BD";

  // Calculate totals
  const subtotal =
    invoice.invoiceItems.reduce((sum, item) => {
      const itemTotal = item.qty * item.amount;
      const chargeAmount = item.charge || 0;
      const discountAmount = item.discount || 0;
      return sum + itemTotal + chargeAmount - discountAmount;
    }, 0) || 0;

  const totalTax =
    invoice.invoiceItems.reduce((sum, item) => {
      return sum + (item.tax || 0);
    }, 0) || 0;

  const grandTotal = invoice.total || subtotal + totalTax;

  // Status badge color
  const getStatusColor = (status: string) => {
    const colors = {
      PAID: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      PARTIALLY_PAID: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-purple-100 text-purple-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Split items into pages (approximately 15 items per page to allow for header/footer)
  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(invoice.invoiceItems.length / ITEMS_PER_PAGE);
  const itemPages: (typeof invoice.invoiceItems)[] = [];

  for (let i = 0; i < totalPages; i++) {
    const start = i * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    itemPages.push(invoice.invoiceItems.slice(start, end));
  }

  // Header component to repeat on each page
  const InvoiceHeader = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
    <div className="invoice-header border-b-2 border-gray-300 pb-6 mb-6">
      <div className="flex justify-between items-start">
        {/* Company Info */}
        <div className="max-w-[50%]">
          {company.logo && <img src={company.logo} alt={company.name || "Company Logo"} className="h-12 mb-3 object-contain" />}
          <h2 className="text-xl font-bold mb-1">{company.name || "Company Name"}</h2>
          <address className="text-xs text-gray-600 not-italic">
            {company.address && (
              <>
                {company.address}
                <br />
              </>
            )}
            {company.telephone && (
              <>
                Tel: {company.telephone}
                <br />
              </>
            )}
            {company.email && (
              <>
                Email: {company.email}
                <br />
              </>
            )}
            {company.vat && <>VAT: {company.vat}</>}
          </address>
        </div>

        {/* Invoice Details */}
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">INVOICE</h1>
          <div className="space-y-1 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-gray-600 font-semibold text-right">Invoice #:</span>
              <span className="font-medium">INV-{invoice.id.toString().padStart(5, "0")}</span>

              <span className="text-gray-600 font-semibold text-right">Date:</span>
              <span className="font-medium">{invoice.date ? new Date(invoice.date).toLocaleDateString("en-GB") : "N/A"}</span>

              <span className="text-gray-600 font-semibold text-right">Status:</span>
              <span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(invoice.status)}`}>{invoice.status.replace("_", " ")}</span>
              </span>

              <span className="text-gray-600 font-semibold text-right">Page:</span>
              <span className="font-medium">
                {pageNumber} of {totalPages}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Footer component to repeat on each page
  const InvoiceFooter = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
    <div className="invoice-footer mt-auto pt-4 border-t border-gray-200">
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Invoice #{invoice.id.toString().padStart(5, "0")}</span>
        <span>
          Page {pageNumber} of {totalPages}
        </span>
        <span>{company.name || ""}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-background">
      {/* Action Buttons - Fixed on mobile, floating on desktop */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center gap-3">
            <div className="text-sm font-medium">Invoice #{data?.invoice.id.toString().padStart(5, "0")}</div>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Print</span>
              </Button>
              <Button onClick={generatePDF} disabled={isGenerating} size="sm">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                    <span className="hidden md:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Download PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Container with Responsive Scaling */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 0.3s ease-in-out",
        }}
        className="container mx-auto py-4 md:py-8 px-4"
      >
        <div className="flex justify-center">
          <div ref={invoiceRef} className="space-y-4">
            {/* First Page */}
            <div
              className="invoice-page bg-white shadow-lg print:shadow-none print:page-break-after-always flex flex-col"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "15mm",
                boxSizing: "border-box",
              }}
            >
              <InvoiceHeader pageNumber={1} totalPages={totalPages} />

              {/* Bill To Section - Only on first page */}
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Bill To:</h3>
                  {invoice.records ? (
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-gray-900">{invoice.records.name || "N/A"}</p>
                      {invoice.records.code && <p className="text-gray-600">Code: {invoice.records.code}</p>}
                      {invoice.records.email && <p className="text-gray-600">{invoice.records.email}</p>}
                      {invoice.records.phone && <p className="text-gray-600">{invoice.records.phone}</p>}
                      {invoice.records.address && <p className="text-gray-600">{invoice.records.address}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Customer: {invoice.customerId || "N/A"}</p>
                  )}
                </div>
              </div>

              {/* Invoice Title - Only on first page */}
              {invoice.title && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Invoice Description:</h3>
                  <p className="text-sm text-gray-700">{invoice.title}</p>
                </div>
              )}

              {/* Items Table - First Page */}
              <div className="mb-6 flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                      <TableHead className="font-semibold text-gray-800">Description</TableHead>
                      <TableHead className="font-semibold text-gray-800">Type</TableHead>
                      <TableHead className="font-semibold text-gray-800 text-right">Qty</TableHead>
                      <TableHead className="font-semibold text-gray-800 text-right">Rate</TableHead>
                      <TableHead className="font-semibold text-gray-800 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemPages[0]?.map(item => {
                      const itemTotal = item.qty * item.amount;
                      return (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{item.title}</p>
                              {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.type}</span>
                          </TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toFixed(3)} {currency}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {itemTotal.toFixed(3)} {currency}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Show totals only if this is the last page */}
              {totalPages === 1 && (
                <>
                  {/* Totals Section */}
                  <div className="flex justify-end mb-8">
                    <div className="w-80">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">
                            {subtotal.toFixed(3)} {currency}
                          </span>
                        </div>

                        {totalTax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax:</span>
                            <span className="font-medium">
                              {totalTax.toFixed(3)} {currency}
                            </span>
                          </div>
                        )}

                        <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>
                            {grandTotal.toFixed(3)} {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Signature Section */}
                  <div className="mt-8 pt-6 border-t border-gray-300">
                    <div className="grid grid-cols-2 gap-12">
                      <div>
                        <p className="font-semibold text-gray-700 mb-12">Authorized Signature</p>
                        <div className="border-b-2 border-gray-400 w-48"></div>
                        <p className="text-xs text-gray-500 mt-2">{company.name || ""}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-12">Customer Signature</p>
                        <div className="border-b-2 border-gray-400 w-48"></div>
                        <p className="text-xs text-gray-500 mt-2">{invoice.records?.name || ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="mt-8 text-center text-xs text-gray-500">
                    <p>Thank you for your business!</p>
                  </div>
                </>
              )}

              <InvoiceFooter pageNumber={1} totalPages={totalPages} />
            </div>

            {/* Subsequent Pages */}
            {itemPages.slice(1).map((pageItems, pageIndex) => {
              const pageNumber = pageIndex + 2;
              const isLastPage = pageNumber === totalPages;

              return (
                <div
                  key={pageNumber}
                  className="invoice-page bg-white shadow-lg print:shadow-none print:page-break-after-always flex flex-col"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    padding: "15mm",
                    boxSizing: "border-box",
                  }}
                >
                  <InvoiceHeader pageNumber={pageNumber} totalPages={totalPages} />

                  {/* Items Table - Continuation */}
                  <div className="mb-6 flex-grow">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100 hover:bg-gray-100">
                          <TableHead className="font-semibold text-gray-800">Description</TableHead>
                          <TableHead className="font-semibold text-gray-800">Type</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-right">Qty</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-right">Rate</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageItems.map(item => {
                          const itemTotal = item.qty * item.amount;
                          return (
                            <TableRow key={item.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-900">{item.title}</p>
                                  {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.type}</span>
                              </TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">
                                {item.amount.toFixed(3)} {currency}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {itemTotal.toFixed(3)} {currency}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Show totals only on last page */}
                  {isLastPage && (
                    <>
                      {/* Totals Section */}
                      <div className="flex justify-end mb-8">
                        <div className="w-80">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium">
                                {subtotal.toFixed(3)} {currency}
                              </span>
                            </div>

                            {totalTax > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-medium">
                                  {totalTax.toFixed(3)} {currency}
                                </span>
                              </div>
                            )}

                            <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-lg font-bold">
                              <span>Total:</span>
                              <span>
                                {grandTotal.toFixed(3)} {currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer - Signature Section */}
                      <div className="mt-8 pt-6 border-t border-gray-300">
                        <div className="grid grid-cols-2 gap-12">
                          <div>
                            <p className="font-semibold text-gray-700 mb-12">Authorized Signature</p>
                            <div className="border-b-2 border-gray-400 w-48"></div>
                            <p className="text-xs text-gray-500 mt-2">{company.name || ""}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-12">Customer Signature</p>
                            <div className="border-b-2 border-gray-400 w-48"></div>
                            <p className="text-xs text-gray-500 mt-2">{invoice.records?.name || ""}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="mt-8 text-center text-xs text-gray-500">
                        <p>Thank you for your business!</p>
                      </div>
                    </>
                  )}

                  <InvoiceFooter pageNumber={pageNumber} totalPages={totalPages} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .invoice-page {
            box-shadow: none !important;
            margin: 0 !important;
            transform: scale(1) !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
