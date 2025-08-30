"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";

// Mock data for demonstration
const archiveDeals = [
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
  },
  {
    id: 3,
    clientName: "Global Solutions Ltd.",
    clientInitials: "GS",
    clientAvatar: "/corporate-executive.png",
    dealValue: 78000,
    status: "Proposal Sent",
    lastContact: "2024-01-10",
    description: "Custom CRM implementation",
    priority: "High",
  },
];

const historyDeals = [
  {
    id: 4,
    clientName: "Innovation Labs",
    clientInitials: "IL",
    clientAvatar: "/innovation-lab-person.png",
    dealValue: 32000,
    completedDate: "2024-01-08",
    description: "Cloud migration services",
    invoiceGenerated: false,
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
  },
  {
    id: 6,
    clientName: "Healthcare Partners",
    clientInitials: "HP",
    clientAvatar: "/healthcare-professional.png",
    dealValue: 95000,
    completedDate: "2023-12-28",
    description: "Electronic health records system",
    invoiceGenerated: true,
  },
];

export default function SalesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("archive");
  const router = useRouter();

  const filteredArchiveDeals = archiveDeals.filter(
    (deal) =>
      deal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistoryDeals = historyDeals.filter(
    (deal) =>
      deal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleCardClick = (dealId: number) => {
    router.push(`Sales/${dealId}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search deals by client name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add New Deal
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="archive" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Archive ({filteredArchiveDeals.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              History ({filteredHistoryDeals.length})
            </TabsTrigger>
          </TabsList>

          {/* Archive Tab Content */}
          <TabsContent value="archive" className="space-y-4">
            {filteredArchiveDeals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No active deals found
                  </h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Start by adding a new deal"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArchiveDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleCardClick(deal.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={deal.clientAvatar || "/placeholder.svg"}
                              alt={deal.clientName}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {deal.clientInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg text-balance">
                              {deal.clientName}
                            </CardTitle>
                            <CardDescription className="text-pretty">
                              {deal.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(deal.priority)}>
                          {deal.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            ${deal.dealValue.toLocaleString()}
                          </span>
                        </div>
                        <Badge className={getStatusColor(deal.status)}>
                          {deal.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Last contact: {deal.lastContact}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          Update
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab Content */}
          <TabsContent value="history" className="space-y-4">
            {filteredHistoryDeals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No completed deals found
                  </h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Completed deals will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredHistoryDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleCardClick(deal.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={deal.clientAvatar || "/placeholder.svg"}
                              alt={deal.clientName}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {deal.clientInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg text-balance">
                              {deal.clientName}
                            </CardTitle>
                            <CardDescription className="text-pretty">
                              {deal.description}
                            </CardDescription>
                          </div>
                        </div>
                        {deal.invoiceGenerated && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Invoice Generated
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            ${deal.dealValue.toLocaleString()}
                          </span>
                        </div>
                        {!deal.invoiceGenerated && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            Pending Invoice
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Completed: {deal.completedDate}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90"
                          disabled={deal.invoiceGenerated}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {deal.invoiceGenerated
                            ? "Generated"
                            : "Generate Invoice"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
