"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Download,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { SalesChart } from "./Sales-Chart";
import { InventoryChart } from "./Inventory-Chart";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <div className="p-4 lg:p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="h-9">
              <Plus className="mr-2 h-4 w-4" />
              New Job Card
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className=" text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold truncate">0</div>
            </CardContent>
            <CardFooter className="flex items-center space-x-2">
              {/* <Badge variant="destructive" className="text-xs">
                <ArrowUp className="mr-1 h-3 w-3" />
                12.5%
              </Badge> */}
              {/* <p className="text-xs text-muted-foreground">from last month</p> */}
            </CardFooter>
          </Card>
          <Card className="gap-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Job Cards
              </CardTitle>
              <Wrench className=" text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold truncate">0</div>
            </CardContent>
            <CardFooter className="flex items-center space-x-2">
              {/* <Badge variant="success">
                <ArrowUp className="mr-1 h-3 w-3" />
                8.2%
              </Badge> */}
              {/* <p className="text-xs text-muted-foreground">from last week</p> */}
            </CardFooter>
          </Card>
          <Card className="gap-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Inventory Items
              </CardTitle>
              <Package className=" text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold truncate">0</div>
            </CardContent>
            <CardFooter className="flex items-center space-x-2">
              {/* <Badge variant="warning" className="text-xs">
                <ArrowDown className="mr-1 h-3 w-3" />
                3.1%
              </Badge> */}
              {/* <p className="text-xs text-muted-foreground">low stock items</p> */}
            </CardFooter>
          </Card>
          <Card className="gap-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sales This Week
              </CardTitle>
              <ShoppingCart className=" text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold truncate">0</div>
              <div className="flex items-center space-x-2">
                {/* <Badge variant="success" className="text-xs">
                  <ArrowUp className="mr-1 h-3 w-3" />
                  18.3%
                </Badge> */}
                {/* <p className="text-xs text-muted-foreground">from last week</p> */}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="job-cards">Job Cards</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Sales Overview</CardTitle>
                  <CardDescription>
                    View your sales performance over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                  <SalesChart />
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Inventory Status</CardTitle>
                  <CardDescription>
                    Current inventory levels by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryChart />
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Recent Job Cards</CardTitle>
                    <CardDescription>
                      Latest job cards created or updated
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">JC-1001</TableCell>
                        <TableCell>Acme Corp</TableCell>
                        <TableCell>
                          <Badge variant="warning">In Progress</Badge>
                        </TableCell>
                        <TableCell>Apr 23, 2025</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <span className="sr-only">Open menu</span>
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View details</DropdownMenuItem>
                              <DropdownMenuItem>Edit job card</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                Mark as complete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">JC-1002</TableCell>
                        <TableCell>TechSolutions Inc</TableCell>
                        <TableCell>
                          <Badge variant="success">Completed</Badge>
                        </TableCell>
                        <TableCell>Apr 21, 2025</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <span className="sr-only">Open menu</span>
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View details</DropdownMenuItem>
                              <DropdownMenuItem>Edit job card</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Archive</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">JC-1003</TableCell>
                        <TableCell>Global Enterprises</TableCell>
                        <TableCell>
                          <Badge variant="default">Pending</Badge>
                        </TableCell>
                        <TableCell>Apr 25, 2025</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <span className="sr-only">Open menu</span>
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View details</DropdownMenuItem>
                              <DropdownMenuItem>Edit job card</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Start job</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Items</CardTitle>
                  <CardDescription>
                    Inventory items that need reordering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Brake Pads</span>
                          <Badge variant="outline" className="text-xs">
                            5 left
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          Order
                        </Button>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Oil Filters</span>
                          <Badge variant="outline" className="text-xs">
                            8 left
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          Order
                        </Button>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Spark Plugs</span>
                          <Badge variant="outline" className="text-xs">
                            3 left
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          Order
                        </Button>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Wiper Blades</span>
                          <Badge variant="outline" className="text-xs">
                            7 left
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          Order
                        </Button>
                      </div>
                      <Progress value={20} className="h-2" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View All Low Stock Items
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="job-cards" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Job Cards</CardTitle>
                  <CardDescription>
                    Manage and track all job cards
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search job cards..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Job Card
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 py-4">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="newest">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="due-date">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">JC-1001</TableCell>
                      <TableCell>Acme Corp</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        Engine repair and full service
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">In Progress</Badge>
                      </TableCell>
                      <TableCell>Apr 18, 2025</TableCell>
                      <TableCell>Apr 23, 2025</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit job card</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              Mark as complete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">JC-1002</TableCell>
                      <TableCell>TechSolutions Inc</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        Brake replacement and wheel alignment
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 hover:bg-green-100"
                        >
                          Completed
                        </Badge>
                      </TableCell>
                      <TableCell>Apr 15, 2025</TableCell>
                      <TableCell>Apr 21, 2025</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit job card</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">JC-1003</TableCell>
                      <TableCell>Global Enterprises</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        Transmission service and fluid change
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                        >
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>Apr 20, 2025</TableCell>
                      <TableCell>Apr 25, 2025</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit job card</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Start job</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">JC-1004</TableCell>
                      <TableCell>Innovative Solutions</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        Air conditioning repair and recharge
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 hover:bg-red-100"
                        >
                          Cancelled
                        </Badge>
                      </TableCell>
                      <TableCell>Apr 10, 2025</TableCell>
                      <TableCell>Apr 19, 2025</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Restore job</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing 4 of 24 job cards
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>
                    Track and manage your inventory items
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search inventory..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 py-4">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="parts">Parts</SelectItem>
                      <SelectItem value="tools">Tools</SelectItem>
                      <SelectItem value="consumables">Consumables</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="in-stock">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                      <SelectItem value="on-order">On Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">BP-1234</TableCell>
                      <TableCell>Brake Pads</TableCell>
                      <TableCell>Parts</TableCell>
                      <TableCell>5</TableCell>
                      <TableCell>$45.99</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 hover:bg-red-100"
                        >
                          Low Stock
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit item</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Order more</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">OF-5678</TableCell>
                      <TableCell>Oil Filters</TableCell>
                      <TableCell>Parts</TableCell>
                      <TableCell>8</TableCell>
                      <TableCell>$12.99</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        >
                          Low Stock
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit item</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Order more</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SP-9012</TableCell>
                      <TableCell>Spark Plugs</TableCell>
                      <TableCell>Parts</TableCell>
                      <TableCell>3</TableCell>
                      <TableCell>$8.99</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 hover:bg-red-100"
                        >
                          Low Stock
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit item</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Order more</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">WB-3456</TableCell>
                      <TableCell>Wiper Blades</TableCell>
                      <TableCell>Accessories</TableCell>
                      <TableCell>7</TableCell>
                      <TableCell>$15.99</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        >
                          Low Stock
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit item</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Order more</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing 4 of 1,245 inventory items
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Sales Analytics</CardTitle>
                  <CardDescription>
                    Track and analyze your sales performance
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <SalesChart />
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest sales transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">INV-001</TableCell>
                        <TableCell>Acme Corp</TableCell>
                        <TableCell>$1,250.00</TableCell>
                        <TableCell>Apr 20, 2025</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV-002</TableCell>
                        <TableCell>TechSolutions Inc</TableCell>
                        <TableCell>$850.00</TableCell>
                        <TableCell>Apr 19, 2025</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV-003</TableCell>
                        <TableCell>Global Enterprises</TableCell>
                        <TableCell>$2,100.00</TableCell>
                        <TableCell>Apr 18, 2025</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          >
                            Pending
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV-004</TableCell>
                        <TableCell>Innovative Solutions</TableCell>
                        <TableCell>$750.00</TableCell>
                        <TableCell>Apr 17, 2025</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View All Sales
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>
                    Most popular items by sales volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Oil Change Service</p>
                        <p className="text-sm text-muted-foreground">
                          149 units sold this month
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$5,960.00</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-green-600">↑ 12%</span> vs last
                          month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Brake Pads</p>
                        <p className="text-sm text-muted-foreground">
                          98 units sold this month
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$4,508.02</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-green-600">↑ 8%</span> vs last
                          month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Tire Rotation</p>
                        <p className="text-sm text-muted-foreground">
                          87 units sold this month
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$3,480.00</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-red-600">↓ 3%</span> vs last
                          month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Air Filters</p>
                        <p className="text-sm text-muted-foreground">
                          76 units sold this month
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$2,280.00</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-green-600">↑ 15%</span> vs last
                          month
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Sales Report
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
