"use client";
import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import InvoiceLoading from "./invoice-loading";
import { Prisma } from "@prisma/client";
import { Settings } from "@/lib/initSettings";

type JobCardWithParts = Prisma.JobCardGetPayload<{
  include: {
    Part: true;
  };
}>;

export default function InvoicePage() {
  const params = useParams();

  const { data, error, isLoading } = useSWR(
    `/api/jobCardInvoice?id=${params.id}`,
    {
      fetcher: (url: string) => fetch(url).then((res) => res.json()),
    }
  );

  if (isLoading) {
    return <InvoiceLoading />;
  }

  if (error || !data) {
    return <div>Error loading job card data</div>;
  }
  if (data) {
    const settingsMap = new Map<Settings["name"], string>();
    if (data.settings) {
      (data.settings as Settings[]).forEach((setting) => {
        settingsMap.set(setting.name, setting.value);
      });
    }
    return <JobCardInvoice jobCard={data.jobCard} settingsMap={settingsMap} />;
  }
  return <></>;
}

function JobCardInvoice({
  jobCard,
  settingsMap,
}: {
  jobCard: Prisma.JobCardGetPayload<{
    include: {
      Part: true;
    };
  }>;
  settingsMap: Map<Settings["name"], string> | undefined;
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    setIsGenerating(true);

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`job-card-invoice-${jobCard.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 text-black">
      <div className="flex justify-end mb-4 print:hidden px-6">
        <Button onClick={generatePDF} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      <div
        ref={invoiceRef}
        className="invoice bg-white shadow-[0px_0px_50px_25px_rgba(0,_0,_0,_0.1)] mx-auto"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "10mm",
          boxSizing: "border-box",
        }}
      >
        <div className="invoice-header border-b pb-4 mb-6">
          <div className="flex flex-row-reverse justify-between items-start text-end">
            <div className="text-right">
              <h1 className="text-2xl font-bold uppercase mb-2">
                Job Card Invoice
              </h1>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p className="text-muted-foreground font-semibold">IVN:</p>
                <span className="font-medium">
                  {jobCard.id.toString().padStart(5, "0")}
                </span>
                <p className="text-muted-foreground font-semibold">Date:</p>
                <span className="font-medium">
                  {jobCard.date
                    ? new Date(jobCard.date).toLocaleDateString("en-GB")
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="text-start">
              <h2 className="text-2xl font-bold uppercase mb-2">
                {settingsMap?.get("companyName") || ""}
              </h2>
              <address className="text-muted-foreground font-semibold">
                {settingsMap?.get("companyAddress") || ""}
                <br />
                {settingsMap?.get("companyPhone") || ""}
              </address>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 ">
          <div className=" bg-white gap-2 text-black rounded-xl border overflow-hidden">
            <h3 className="font-semibold p-2 bg-gray-100">Vehicle Details</h3>
            <div className="p-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Vehicle No:</div>
                <div>{jobCard.vehicleNo || "N/A"}</div>
                <div className="text-muted-foreground">Manufacturer:</div>
                <div>{jobCard.manufacturer || "N/A"}</div>
                <div className="text-muted-foreground">Model:</div>
                <div>{jobCard.model || "N/A"}</div>
                <div className="text-muted-foreground">Vehicle Type:</div>
                <div>{jobCard.type || "N/A"}</div>
                <div className="text-muted-foreground">Current KM:</div>
                <div>{jobCard.km || "N/A"}</div>
              </div>
            </div>
          </div>
          <div className=" bg-white text-black gap-2 border rounded-xl overflow-hidden">
            <h3 className="font-semibold bg-gray-100 p-2">Job Details</h3>
            <div className="p-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Mechanic:</div>
                <div>{jobCard.mechanic || "N/A"}</div>

                <div className="text-muted-foreground">Operator:</div>
                <div>{jobCard.operator || "N/A"}</div>

                <div className="text-muted-foreground">Site/Department:</div>
                <div>{jobCard.department || "N/A"}</div>
                <div className="text-muted-foreground">Next Service Date:</div>
                <div>
                  {jobCard.nextServiceDate
                    ? new Date(jobCard.nextServiceDate).toLocaleDateString(
                        "en-GB"
                      )
                    : "N/A"}
                </div>
                <div className="text-muted-foreground">Next Service KM:</div>
                <div>{jobCard.nextServiceKm || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white invoice-header border-b  overflow-hidden border rounded-xl">
          <div>
            <div className="p-2 font-semibold bg-gray-100">
              Problem Description
            </div>
            <p className="p-2">{jobCard.description}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-semibold mb-4">Parts & Services</h3>
          <Table>
            <TableHeader className="bg-gray-100 ">
              <TableRow className="hover:bg-transparent">
                <TableHead>Part Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobCard.Part.map((part) => (
                <TableRow className="hover:bg-transparent" key={part.id}>
                  <TableCell>{part.partCode || "N/A"}</TableCell>
                  <TableCell>{part.description || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    {part.quantity || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {part.rate ? (part?.rate / 1000).toFixed(3) : "0.000"}
                    {" BD"}
                  </TableCell>
                  <TableCell className="text-right">
                    {part.amount?.toFixed(3) || "0.00"}
                    {" BD"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-1/3">
            {/* <div className="flex justify-between py-2 font-medium">
              <span>Subtotal:</span>
              <span>
                {jobCard.Part.reduce(
                  (sum, part) => sum + (part.amount || 0),
                  0
                ).toFixed(2)}
              </span>
            </div> */}
            {/* <div className="flex justify-between py-2 font-medium">
              <span>Tax (10%):</span>
              <span>0.00</span>
            </div> */}
            <div className="flex justify-between py-2 border-t border-t-border font-bold">
              <span>Total:</span>
              <span>
                {jobCard.totalAmount?.toFixed(3) ||
                  jobCard.Part.reduce(
                    (sum, part) => sum + (part.amount || 0),
                    0
                  ).toFixed(3)}
                {" BD"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="font-semibold mb-12">Customer Signature</p>
            <div className="border-b h-0 w-48"></div>
          </div>
          <div>
            <p className="font-semibold mb-12">Mechanic Signature</p>
            <div className="border-b h-0 w-48"></div>
          </div>
          <div>
            <p className="font-semibold mb-12">Garage Manager Signature</p>
            <div className="border-b h-0 w-48"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
