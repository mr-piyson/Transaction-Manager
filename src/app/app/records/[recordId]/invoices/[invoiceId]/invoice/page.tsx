"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateInvoicePdf, InvoiceData } from "./invoice-pdf";

function useBlobUrl(bytes?: Uint8Array) {
  return useMemo(() => {
    if (!bytes) return "";
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [bytes]);
}

export default function InvoiceViewer({ data }: { data: InvoiceData }) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
  const [loading, setLoading] = useState(false);

  const url = useBlobUrl(pdfBytes);

  const onGenerate = async () => {
    setLoading(true);
    try {
      let bytes;
      if (data) {
        bytes = await generateInvoicePdf(data);
      } else {
        bytes = await generateInvoicePdf({
          invoiceNumber: "string",
          issueDate: "string",
          dueDate: "string",
          billTo: {
            name: "string",
            address: "string",
            email: "string",
          },
          from: {
            name: "string",
            address: "string",
            email: "string",
          },
          currency: "BHD",
          items: [
            {
              description: "",
              quantity: 1,
              unitPrice: 1,
            },
          ],
          notes: "string",
        });
      }

      setPdfBytes(bytes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoice Preview</CardTitle>
        <Button onClick={onGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate PDF"}
        </Button>
      </CardHeader>

      <CardContent>
        <div className="w-full overflow-hidden rounded-xl border">
          {/* Responsive iframe container */}
          <div className="relative w-full">
            <div className="aspect-210/297 sm:aspect-3/4 md:aspect-4/5 lg:aspect-[1/1.4142]">
              {url ? (
                <iframe src={url} className="absolute inset-0 h-full w-full" title="Invoice PDF" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Click “Generate PDF”</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
