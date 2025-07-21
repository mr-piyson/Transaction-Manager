"use client";

import { useState } from "react";
import {
  BarChart3,
  Bell,
  Box,
  Computer,
  CreditCard,
  Filter,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Ticket,
  TrendingUp,
  User,
  UserCircle,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ChartExample } from "./Pie-Chart";

// Navigation items organized by category
const navigationItems = {
  main: [
    {
      title: "Dashboard",
      url: "/App/Dashboard",
      icon: BarChart3,
      isActive: true,
    },
    { title: "Assets", url: "/App/Assets", icon: Computer },
    { title: "Tickets", url: "/App/Tickets", icon: Ticket },
  ],
  management: [
    { title: "Employees", url: "/App/Employees", icon: Users },
    { title: "Vendors", url: "/App/Vendors", icon: ShoppingCart },
    { title: "Stock", url: "/App/Stock", icon: Box },
  ],
  system: [
    { title: "Accounts", url: "/App/Accounts", icon: UserCircle },
    { title: "Notifications", url: "/App/Notifications", icon: Bell },
    { title: "Settings", url: "/App/Settings", icon: Settings },
  ],
};

// Sample data
const recentTickets = [
  {
    id: "TK-001",
    title: "Laptop Screen Replacement",
    priority: "High",
    assignee: "John Doe",
    status: "In Progress",
    created: "2 hours ago",
  },
  {
    id: "TK-002",
    title: "Network Connectivity Issue",
    priority: "Medium",
    assignee: "Jane Smith",
    status: "Open",
    created: "4 hours ago",
  },
  {
    id: "TK-003",
    title: "Software Installation",
    priority: "Low",
    assignee: "Mike Johnson",
    status: "Resolved",
    created: "1 day ago",
  },
  {
    id: "TK-004",
    title: "Printer Maintenance",
    priority: "Medium",
    assignee: "Sarah Wilson",
    status: "Open",
    created: "2 days ago",
  },
];

const recentAssets = [
  {
    id: "AS-001",
    name: "Dell Laptop XPS 13",
    category: "Laptop",
    status: "Active",
    location: "Office A",
    assignee: "John Doe",
  },
  {
    id: "AS-002",
    name: "HP Printer LaserJet",
    category: "Printer",
    status: "Maintenance",
    location: "Office B",
    assignee: "Jane Smith",
  },
  {
    id: "AS-003",
    name: "iPhone 14 Pro",
    category: "Mobile",
    status: "Active",
    location: "Remote",
    assignee: "Mike Johnson",
  },
  {
    id: "AS-004",
    name: 'Monitor 27" 4K',
    category: "Monitor",
    status: "Active",
    location: "Office A",
    assignee: "Sarah Wilson",
  },
];

const quickStats = [
  {
    label: "Assets Due for Maintenance",
    value: "12",
    trend: "+2",
    color: "text-orange-600",
  },
  { label: "Overdue Tickets", value: "3", trend: "-1", color: "text-red-600" },
  {
    label: "Available Stock Items",
    value: "89",
    trend: "+5",
    color: "text-green-600",
  },
  {
    label: "Active Employees",
    value: "156",
    trend: "+2",
    color: "text-blue-600",
  },
];

function MobileNavigation() {
  const allItems = [
    ...navigationItems.main,
    ...navigationItems.management,
    ...navigationItems.system,
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center gap-2 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Computer className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">AssetFlow</span>
              <span className="truncate text-xs text-muted-foreground">
                Asset Management
              </span>
            </div>
          </div>
          <div className="space-y-2 px-4">
            {allItems.map((item) => (
              <a
                key={item.title}
                href={item.url}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Main Content */}
      <main className=" py-6 ">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button>
              <i className="icon-[heroicons-solid--plus] size-4"></i>
              New Asset
            </Button>
            <Button>
              <i className="icon-[solar--ticket-linear] size-4"></i>
              New Ticket
            </Button>
            <Button>
              <i className="icon-[tdesign--undertake-delivery] size-4"></i>
              New Provide
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Assets
              </CardTitle>
              <Computer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Tickets
              </CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">+3</span> from yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+2</span> new this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$89,432</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Alert Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`text-sm font-medium ${stat.color}`}>
                    {stat.trend}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chart */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <ChartExample />
          <div className="sm:hidden"></div>
          <div className="sm:hidden"></div>
        </div>
        {/* Charts and Analytics */}
        <div className="grid gap-6 lg:grid-cols-7 mb-8">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Asset Distribution</CardTitle>
              <CardDescription>Breakdown of assets by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">Laptops</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={65} className="w-24" />
                  <span className="text-sm text-muted-foreground w-12">
                    65%
                  </span>
                  <span className="text-sm font-medium w-8">812</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Desktops</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={25} className="w-24" />
                  <span className="text-sm text-muted-foreground w-12">
                    25%
                  </span>
                  <span className="text-sm font-medium w-8">312</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium">Monitors</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={45} className="w-24" />
                  <span className="text-sm text-muted-foreground w-12">
                    45%
                  </span>
                  <span className="text-sm font-medium w-8">561</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium">Printers</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={15} className="w-24" />
                  <span className="text-sm text-muted-foreground w-12">
                    15%
                  </span>
                  <span className="text-sm font-medium w-8">187</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium">Mobile</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={35} className="w-24" />
                  <span className="text-sm text-muted-foreground w-12">
                    35%
                  </span>
                  <span className="text-sm font-medium w-8">436</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Ticket Priority</CardTitle>
              <CardDescription>
                Current ticket distribution by priority
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    8
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    12
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Low Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    3
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
              <TabsTrigger value="tickets">Recent Tickets</TabsTrigger>
              <TabsTrigger value="assets">Recent Assets</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>
                  Latest support tickets and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          {ticket.id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ticket.priority === "High"
                                ? "destructive"
                                : ticket.priority === "Medium"
                                ? "default"
                                : "warning"
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.assignee}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ticket.status === "Resolved"
                                ? "default"
                                : ticket.status === "In Progress"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.created}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Ticket</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Close Ticket</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Assets</CardTitle>
                <CardDescription>
                  Recently added or updated assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          {asset.id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {asset.name}
                        </TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              asset.status === "Active"
                                ? "default"
                                : asset.status === "Maintenance"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{asset.assignee}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Asset</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                Transfer Asset
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used actions for asset management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button className="h-20 flex-col gap-2">
                <Plus className="h-6 w-6" />
                Add New Asset
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <Ticket className="h-6 w-6" />
                Create Ticket
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <Users className="h-6 w-6" />
                Add Employee
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <TrendingUp className="h-6 w-6" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
