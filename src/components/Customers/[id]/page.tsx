"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Calendar, DollarSign, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock customer data (same as in customer-page.tsx)
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
    notes: "VIP customer with consistent high-value orders. Prefers email communication.",
    orders: [
      { id: 1001, date: "2024-01-15", amount: 1250, status: "Completed" },
      { id: 1002, date: "2024-01-08", amount: 890, status: "Completed" },
      { id: 1003, date: "2023-12-22", amount: 2100, status: "Completed" },
    ],
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
    notes: "Tech-savvy customer who frequently orders digital services.",
    orders: [
      { id: 1004, date: "2024-01-12", amount: 650, status: "Completed" },
      { id: 1005, date: "2024-01-05", amount: 420, status: "Completed" },
    ],
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
    notes: "Creative professional. Last active in November 2023.",
    orders: [
      { id: 1006, date: "2023-11-28", amount: 780, status: "Completed" },
      { id: 1007, date: "2023-10-15", amount: 320, status: "Completed" },
    ],
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
    notes: "Long-term customer with highest lifetime value. Bulk order specialist.",
    orders: [
      { id: 1008, date: "2024-01-18", amount: 3200, status: "Completed" },
      { id: 1009, date: "2024-01-10", amount: 1850, status: "Completed" },
      { id: 1010, date: "2024-01-03", amount: 2750, status: "Completed" },
    ],
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
    notes: "Innovation-focused customer interested in cutting-edge solutions.",
    orders: [
      { id: 1011, date: "2024-01-10", amount: 920, status: "Completed" },
      { id: 1012, date: "2023-12-28", amount: 1100, status: "Completed" },
    ],
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
    notes: "New customer, recently joined. Potential for growth.",
    orders: [
      { id: 1013, date: "2024-01-05", amount: 250, status: "Completed" },
      { id: 1014, date: "2024-01-02", amount: 200, status: "Pending" },
    ],
  },
];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = Number.parseInt(params.id as string);

  const customer = mockCustomers.find(c => c.id === customerId);

  if (!customer) {
    return (
      <div className="h-full bg-background ">
        <div className="mx-auto max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold">Customer Not Found</h1>
            <p className="text-muted-foreground mt-2">The customer you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Inactive":
        return "destructive";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Pending":
        return "warning";
      case "Cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="h-full bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
            <span className="max-sm:hidden">Back</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-balance">{customer.name}</h1>
            <p className="text-muted-foreground mt-1">{customer.company}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Edit className="h-4 w-4" />
              Edit Customer
            </Button>
            <Button variant="outline" className="gap-2 bg-destructive text-destructive-foreground hover:text-white hover:bg-destructive-foreground ">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-background shadow-lg">
                      <AvatarImage
                        src={`/smiling-woman-curly-brown-hair-headshot.png?key=5gf38&height=160&width=160&query=professional headshot of ${customer.name}`}
                        alt={customer.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {customer.name
                          .split(" ")
                          .map(n => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Badge variant={getStatusColor(customer.status)} className={`absolute -bottom-2 -right-2`}>
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold">{customer.name}</h2>
                    <p className="text-lg text-muted-foreground">{customer.company}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.email}</span>
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Join Date</p>
                        <p className="font-medium">{customer.joinDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Last Order</p>
                        <p className="font-medium">{customer.lastOrder}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="font-medium">${customer.totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="font-medium">{customer.totalOrders}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.orders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getOrderStatusColor(order.status)}>{order.status}</Badge>
                        <p className="font-semibold">${order.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${customer.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">Lifetime value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{customer.totalOrders}</p>
                <p className="text-sm text-muted-foreground mt-1">Orders placed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Last Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{customer.lastOrder}</p>
                <p className="text-sm text-muted-foreground mt-1">Most recent purchase</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
