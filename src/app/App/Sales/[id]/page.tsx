"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
} from "lucide-react";

// Mock data - in a real app, this would come from an API
const allDeals = [
  {
    id: 1,
    clientName: "Acme Corporation",
    clientInitials: "AC",
    clientAvatar: "/diverse-business-person.png",
    dealValue: 45000,
    status: "In Progress",
    lastContact: "2024-01-15",
    description: "Enterprise software licensing deal",
    priority: "High",
    clientEmail: "contact@acmecorp.com",
    clientPhone: "+1 (555) 123-4567",
    clientAddress: "123 Business Ave, New York, NY 10001",
    createdDate: "2023-12-01",
    notes:
      "Client is interested in our premium enterprise package. They have a team of 200+ employees and need advanced security features.",
    type: "archive",
  },
  {
    id: 2,
    clientName: "TechStart Inc.",
    clientInitials: "TI",
    clientAvatar: "/tech-startup-person.png",
    dealValue: 12500,
    status: "Negotiation",
    lastContact: "2024-01-12",
    description: "Marketing automation platform",
    priority: "Medium",
    clientEmail: "hello@techstart.com",
    clientPhone: "+1 (555) 987-6543",
    clientAddress: "456 Startup Blvd, San Francisco, CA 94105",
    createdDate: "2023-12-15",
    notes:
      "Small startup looking for cost-effective marketing automation. Budget is tight but they're growing fast.",
    type: "archive",
  },
  {
    id: 4,
    clientName: "Innovation Labs",
    clientInitials: "IL",
    clientAvatar: "/innovation-lab-person.png",
    dealValue: 32000,
    completedDate: "2024-01-08",
    description: "Cloud migration services",
    invoiceGenerated: false,
    clientEmail: "projects@innovationlabs.com",
    clientPhone: "+1 (555) 456-7890",
    clientAddress: "789 Tech Park, Austin, TX 73301",
    createdDate: "2023-11-20",
    notes:
      "Successfully migrated their entire infrastructure to AWS. Project completed ahead of schedule.",
    type: "history",
  },
  {
    id: 5,
    clientName: "Metro Retail Group",
    clientInitials: "MR",
    clientAvatar: "/retail-manager.png",
    dealValue: 18500,
    completedDate: "2024-01-05",
    description: "POS system upgrade",
    invoiceGenerated: true,
    clientEmail: "it@metroretail.com",
    clientPhone: "+1 (555) 321-0987",
    clientAddress: "321 Retail St, Chicago, IL 60601",
    createdDate: "2023-11-10",
    notes:
      "Upgraded POS systems across 15 retail locations. Invoice has been generated and sent.",
    type: "history",
  },
];

export default function DealRecord() {
  const params = useParams();
  const router = useRouter();
  const dealId = Number.parseInt(params.id as string);

  const deal = allDeals.find((d) => d.id === dealId);

  if (!deal) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Deal not found
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                The deal you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sales Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Negotiation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Proposal Sent":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales Management
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">
                Deal Record
              </h1>
              <p className="text-muted-foreground text-pretty">
                Detailed information about this deal
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Deal
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Deal Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Deal Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={deal.clientAvatar || "/placeholder.svg"}
                        alt={deal.clientName}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {deal.clientInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl text-balance">
                        {deal.clientName}
                      </CardTitle>
                      <CardDescription className="text-lg text-pretty">
                        {deal.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {deal.type === "archive" && deal.priority && (
                      <Badge className={getPriorityColor(deal.priority)}>
                        {deal.priority} Priority
                      </Badge>
                    )}
                    {deal.status && (
                      <Badge className={getStatusColor(deal.status)}>
                        {deal.status}
                      </Badge>
                    )}
                    {deal.type === "history" && deal.invoiceGenerated && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Invoice Generated
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold text-foreground">
                    ${deal.dealValue.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{deal.createdDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {deal.type === "archive" ? "Last Contact:" : "Completed:"}
                    </span>
                    <span className="font-medium">
                      {deal.type === "archive"
                        ? deal.lastContact
                        : deal.completedDate}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-pretty">
                  {deal.notes}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{deal.clientEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{deal.clientPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium text-pretty">
                      {deal.clientAddress}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal.type === "history" && !deal.invoiceGenerated && (
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </Button>
                )}
                {deal.type === "history" && deal.invoiceGenerated && (
                  <Button variant="outline" className="w-full bg-transparent">
                    <FileText className="h-4 w-4 mr-2" />
                    View Invoice
                  </Button>
                )}
                {deal.type === "archive" && (
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Mark as Completed
                  </Button>
                )}
                <Button variant="outline" className="w-full bg-transparent">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
