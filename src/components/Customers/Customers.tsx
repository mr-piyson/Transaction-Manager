"use client";

import { Edit, Eye, Grid3X3, List, Mail, MapPin, MoreHorizontal, Phone, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

// Mock customer data
const mockCustomers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    company: "Tech Solutions Inc.",
    location: "New York, NY",
    status: "Active",
    totalOrders: 24,
    totalSpent: 15420,
    lastOrder: "2024-01-15",
    joinDate: "2023-03-10",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@email.com",
    phone: "+1 (555) 987-6543",
    company: "Digital Marketing Pro",
    location: "San Francisco, CA",
    status: "Active",
    totalOrders: 18,
    totalSpent: 8750,
    lastOrder: "2024-01-12",
    joinDate: "2023-05-22",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.rodriguez@email.com",
    phone: "+1 (555) 456-7890",
    company: "Creative Studio LLC",
    location: "Austin, TX",
    status: "Inactive",
    totalOrders: 7,
    totalSpent: 3200,
    lastOrder: "2023-11-28",
    joinDate: "2023-08-15",
  },
  {
    id: 4,
    name: "David Thompson",
    email: "david.thompson@email.com",
    phone: "+1 (555) 321-0987",
    company: "Thompson Consulting",
    location: "Chicago, IL",
    status: "Active",
    totalOrders: 31,
    totalSpent: 22100,
    lastOrder: "2024-01-18",
    joinDate: "2022-11-03",
  },
  {
    id: 5,
    name: "Lisa Wang",
    email: "lisa.wang@email.com",
    phone: "+1 (555) 654-3210",
    company: "Innovation Labs",
    location: "Seattle, WA",
    status: "Active",
    totalOrders: 12,
    totalSpent: 6800,
    lastOrder: "2024-01-10",
    joinDate: "2023-07-08",
  },
  {
    id: 6,
    name: "Robert Martinez",
    email: "robert.martinez@email.com",
    phone: "+1 (555) 789-0123",
    company: "Martinez & Associates",
    location: "Miami, FL",
    status: "Pending",
    totalOrders: 2,
    totalSpent: 450,
    lastOrder: "2024-01-05",
    joinDate: "2024-01-01",
  },
];

type ViewMode = "grid" | "list";

export default function CustomerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const router = useRouter();

  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter(
      customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Inactive":
        return "destructive";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getCustomerInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const handleViewCustomer = (customerId: number) => {
    router.push(`/app/customers/${customerId}`);
  };

  return (
    <div className="h-full bg-background p-6">
      <div className="">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">Customer Management</h1>
            <p className="text-muted-foreground mt-2">Manage and track your customer relationships</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers by name, email, company, or location..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-12 text-base" />
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("gap-2", viewMode === "grid" && "bg-primary text-primary-foreground")}
            >
              <Grid3X3 className="h-4 w-4" />
              Grid View
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn("gap-2", viewMode === "list" && "bg-primary text-primary-foreground")}
            >
              <List className="h-4 w-4" />
              List View
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredCustomers.length} of {mockCustomers.length} customers
          </div>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCustomers.map(customer => (
              <Link key={customer.id} href={`/app/customers/${customer.id}`} className="hover:shadow-md transition-shadow" draggable="false">
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={`/abstract-geometric-shapes.png?key=xcqt6&height=48&width=48&query=${encodeURIComponent(customer.name + " professional headshot")}`} alt={customer.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getCustomerInitials(customer.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{customer.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{customer.company}</p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(customer.status)}>{customer.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.location}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                        <p className="font-semibold">{customer.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="font-semibold">${customer.totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-primary text-primary-foreground">
                    <th className="text-left p-4 font-semibold">Customer</th>
                    <th className="text-left p-4 font-semibold">Contact</th>
                    <th className="text-left p-4 font-semibold">Company</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Orders</th>
                    <th className="text-left p-4 font-semibold">Total Spent</th>
                    <th className="text-left p-4 font-semibold">Last Order</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className={cn("border-b hover:bg-muted/50 transition-colors cursor-pointer", index % 2 === 0 ? "bg-background" : "bg-muted/20")}
                      onClick={() => handleViewCustomer(customer.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={`/abstract-geometric-shapes.png?key=kl2x4&height=40&width=40&query=${encodeURIComponent(customer.name + " professional headshot")}`}
                              alt={customer.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{getCustomerInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm">{customer.email}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{customer.company}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(customer.status)}>{customer.status}</Badge>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{customer.totalOrders}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">${customer.totalSpent.toLocaleString()}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{customer.lastOrder}</p>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              className="gap-1 bg-transparent"
                              onClick={e => {
                                e.stopPropagation();
                                handleViewCustomer(customer.id);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-1 bg-transparent" onClick={e => e.stopPropagation()}>
                              <Edit className="h-3 w-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-1 bg-transparent" onClick={e => e.stopPropagation()}>
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No customers found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
