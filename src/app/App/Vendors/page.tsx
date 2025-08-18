"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Mock data for demonstration
const mockVendors = [
  {
    id: 1,
    name: "TechCorp Solutions",
    category: "Software",
    status: "Active",
    contractValue: 125000,
    contractEnd: "2024-12-31",
    performance: 92,
    contacts: [
      {
        name: "John Smith",
        position: "Account Manager",
        type: "email",
        value: "john@techcorp.com",
      },
      {
        name: "Sarah Johnson",
        position: "Technical Lead",
        type: "phone",
        value: "+1-555-0123",
      },
    ],
    notes:
      "Primary software vendor for enterprise applications. Excellent support and reliability.",
    image: "/abstract-tech-logo.png",
  },
  {
    id: 2,
    name: "CloudNet Services",
    category: "Infrastructure",
    status: "Active",
    contractValue: 89000,
    contractEnd: "2024-08-15",
    performance: 88,
    contacts: [
      {
        name: "Mike Chen",
        position: "Solutions Architect",
        type: "email",
        value: "mike@cloudnet.com",
      },
    ],
    notes:
      "Cloud infrastructure and networking services. Reliable uptime and good scalability.",
    image: "/cloud-services-logo.png",
  },
  {
    id: 3,
    name: "SecureIT Pro",
    category: "Security",
    status: "Under Review",
    contractValue: 67000,
    contractEnd: "2024-10-30",
    performance: 95,
    contacts: [
      {
        name: "Lisa Rodriguez",
        position: "Security Consultant",
        type: "phone",
        value: "+1-555-0456",
      },
    ],
    notes:
      "Cybersecurity solutions and consulting. Excellent track record with compliance.",
    image: "/security-company-logo.png",
  },
];

const mockMetrics = {
  totalVendors: 24,
  activeContracts: 18,
  totalValue: 2450000,
  avgPerformance: 91,
  expiringContracts: 5,
  pendingReviews: 3,
};

function getStatusColor(status) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Under Review":
      return "bg-yellow-100 text-yellow-800";
    case "Inactive":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPerformanceColor(score) {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-yellow-600";
  return "text-red-600";
}

export default function VendorManagementSystem() {
  const [vendors, setVendors] = useState(mockVendors);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      vendor.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">
                  IT Vendor Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Professional vendor relationship management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                    <DialogDescription>
                      Create a new vendor profile with contact information and
                      contract details.
                    </DialogDescription>
                  </DialogHeader>
                  <VendorForm onClose={() => setIsAddDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-chart-2" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold">
                    {mockMetrics.totalVendors}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-chart-1" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Contracts
                  </p>
                  <p className="text-2xl font-bold">
                    {mockMetrics.activeContracts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">
                    ${(mockMetrics.totalValue / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-4" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Performance
                  </p>
                  <p className="text-2xl font-bold">
                    {mockMetrics.avgPerformance}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-chart-5" />
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">
                    {mockMetrics.expiringContracts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Reviews
                  </p>
                  <p className="text-2xl font-bold">
                    {mockMetrics.pendingReviews}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 p-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors by name or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={vendor.image || "/placeholder.svg"}
                        alt={vendor.name}
                      />
                      <AvatarFallback>
                        {vendor.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg font-serif">
                        {vendor.name}
                      </CardTitle>
                      <CardDescription>{vendor.category}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(vendor.status)}>
                    {vendor.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contract Value</p>
                    <p className="font-semibold">
                      ${vendor.contractValue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contract End</p>
                    <p className="font-semibold">{vendor.contractEnd}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">
                      Performance
                    </span>
                    <span
                      className={`text-sm font-semibold ${getPerformanceColor(
                        vendor.performance
                      )}`}
                    >
                      {vendor.performance}%
                    </span>
                  </div>
                  <Progress value={vendor.performance} className="h-2" />
                </div>

                <div className="space-y-2">
                  {vendor.contacts.slice(0, 2).map((contact, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {contact.type === "email" ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      <span className="text-muted-foreground">
                        {contact.name}
                      </span>
                      <span>({contact.position})</span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {vendor.notes}
                </p>

                <Separator />

                <div className="flex justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <VendorDetails vendor={vendor} />
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or add a new vendor.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Vendor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and contract details.
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <VendorForm
              vendor={selectedVendor}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedVendor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VendorForm({ vendor, onClose }) {
  const [contacts, setContacts] = useState(
    vendor?.contacts || [{ name: "", position: "", type: "email", value: "" }]
  );

  const addContact = () => {
    setContacts([
      ...contacts,
      { name: "", position: "", type: "email", value: "" },
    ]);
  };

  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Vendor Name</Label>
          <Input
            id="name"
            defaultValue={vendor?.name}
            placeholder="Enter vendor name"
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select defaultValue={vendor?.category?.toLowerCase()}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="hardware">Hardware</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contractValue">Contract Value</Label>
          <Input
            id="contractValue"
            type="number"
            defaultValue={vendor?.contractValue}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="contractEnd">Contract End Date</Label>
          <Input
            id="contractEnd"
            type="date"
            defaultValue={vendor?.contractEnd}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          defaultValue={vendor?.notes}
          placeholder="Additional notes about the vendor..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="image">Vendor Logo</Label>
        <Input id="image" type="file" accept="image/*" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Contacts</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addContact}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <Select
                  value={contact.type}
                  onValueChange={(value) => updateContact(index, "type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="Position"
                  value={contact.position}
                  onChange={(e) =>
                    updateContact(index, "position", e.target.value)
                  }
                />
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="Name"
                  value={contact.name}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="Contact value"
                  value={contact.value}
                  onChange={(e) =>
                    updateContact(index, "value", e.target.value)
                  }
                />
              </div>
              <div className="col-span-1">
                {contacts.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeContact(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-primary hover:bg-primary/90">
          {vendor ? "Update Vendor" : "Add Vendor"}
        </Button>
      </div>
    </div>
  );
}

function VendorDetails({ vendor }) {
  return (
    <div>
      <DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={vendor.image || "/placeholder.svg"}
              alt={vendor.name}
            />
            <AvatarFallback className="text-lg">
              {vendor.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-2xl font-serif">
              {vendor.name}
            </DialogTitle>
            <DialogDescription className="text-lg">
              {vendor.category} Vendor
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(vendor.status)}>
                    {vendor.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-semibold">
                    ${vendor.contractValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-semibold">{vendor.contractEnd}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Overall Score:
                    </span>
                    <span
                      className={`font-bold text-lg ${getPerformanceColor(
                        vendor.performance
                      )}`}
                    >
                      {vendor.performance}%
                    </span>
                  </div>
                  <Progress value={vendor.performance} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{vendor.notes}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {vendor.contacts.map((contact, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    {contact.type === "email" ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {contact.position}
                    </p>
                    <p className="text-sm">{contact.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Contract history and documents will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Performance analytics and charts will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
