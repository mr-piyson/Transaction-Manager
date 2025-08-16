"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Grid3X3,
  List,
  Plus,
  Package,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Mock data - replace with actual API calls
const mockItems = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    brand: "TechSound",
    stock: 25,
    purchased: 50,
    provided: 23,
    image: "/wireless-headphones.png",
  },
  {
    id: 2,
    name: "Gaming Mechanical Keyboard",
    brand: "GamePro",
    stock: 0,
    purchased: 30,
    provided: 30,
    image: "/gaming-keyboard.png",
  },
  {
    id: 3,
    name: "4K Webcam",
    brand: "StreamTech",
    stock: 12,
    purchased: 20,
    provided: 8,
    image: "/4k-webcam.png",
  },
  {
    id: 4,
    name: "Wireless Mouse",
    brand: "TechSound",
    stock: 8,
    purchased: 25,
    provided: 17,
    image: "/wireless-mouse.png",
  },
  {
    id: 5,
    name: "USB-C Hub",
    brand: "ConnectPro",
    stock: 0,
    purchased: 15,
    provided: 15,
    image: "/usb-c-hub.png",
  },
  {
    id: 6,
    name: "Portable SSD 1TB",
    brand: "DataStore",
    stock: 18,
    purchased: 40,
    provided: 22,
    image: "/placeholder-4oinl.png",
  },
];

type ViewMode = "grid" | "table";
type FilterType = "all" | "inStock" | "outOfStock";

export default function StockManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filteredItems = useMemo(() => {
    let filtered = mockItems;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock filter
    switch (filterType) {
      case "inStock":
        filtered = filtered.filter((item) => item.stock > 0);
        break;
      case "outOfStock":
        filtered = filtered.filter((item) => item.stock === 0);
        break;
      default:
        break;
    }

    return filtered;
  }, [searchQuery, filterType]);

  const ItemCard = ({ item }: { item: (typeof mockItems)[0] }) => (
    <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-32 w-full bg-muted/30 overflow-hidden">
        {item.image &&
        item.image !== "/placeholder.svg" &&
        item.image !== "/placeholder-4oinl.png" ? (
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
            <Package className="w-12 h-12 text-blue-500 dark:text-blue-400" />
          </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {item.name}
          </h3>
          <p className="text-sm text-muted-foreground">{item.brand}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant={item.stock > 0 ? "default" : "destructive"}
            className="text-xs"
          >
            <Package className="w-3 h-3 mr-1" />
            {item.stock}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            {item.purchased}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <TrendingDown className="w-3 h-3 mr-1" />
            {item.provided}
          </Badge>
        </div>
        <Button variant="link" className="p-0 h-auto text-xs" asChild>
          <a href={`/item/${item.id}`}>View Details →</a>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Stock Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory and track stock levels
          </p>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {/* Filters and Add Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <RadioGroup
              value={filterType}
              onValueChange={(value) => setFilterType(value as FilterType)}
              className="flex flex-row gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="text-sm">
                  All Items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inStock" id="inStock" />
                <Label htmlFor="inStock" className="text-sm">
                  In Stock
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outOfStock" id="outOfStock" />
                <Label htmlFor="outOfStock" className="text-sm">
                  Out of Stock
                </Label>
              </div>
            </RadioGroup>
            <Button asChild>
              <a href="/new-item">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </a>
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Items ({filteredItems.length})
          </p>
        </div>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search terms"
                : "No items match the selected filter"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Purchased</TableHead>
                  <TableHead className="text-center">Provided</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image &&
                      item.image !== "/placeholder.svg" &&
                      item.image !== "/placeholder-4oinl.png" ? (
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.brand}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={item.stock > 0 ? "default" : "destructive"}
                      >
                        {item.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.purchased}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.provided}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <a href={`/item/${item.id}`}>Details</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
