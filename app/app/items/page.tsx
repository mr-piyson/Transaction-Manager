'use client';

import { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ShoppingBag,
  Plus,
  EyeOff,
  Eye,
  ShoppingCart,
  Wrench,
  Package,
  TrendingUp,
  Box,
  Search,
  MoreVertical,
  Trash2,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllCommunityModule, ColDef, ModuleRegistry } from 'ag-grid-community';
import { Header } from '../App-Header';
import { trpc } from '@/lib/trpc/client';
import { CreateItemDialog } from './create-item-dialog';
import { formatAmount, cn } from '@/lib/utils';
import { ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTableTheme } from '@/hooks/use-table-theme';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

ModuleRegistry.registerModules([AllCommunityModule]);

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function PurchaseServicesPage() {
  const [activeTab, setActiveTab] = useState('purchase');
  const [searchTerm, setSearchTerm] = useState('');
  const tableTheme = useTableTheme();
  const utils = trpc.useUtils();

  const { data: products, isLoading: isProductsLoading } = trpc.items.list.useQuery({
    type: 'PRODUCT',
  });
  const { data: services, isLoading: isServicesLoading } = trpc.items.list.useQuery({
    type: 'SERVICE',
  });

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success('Item deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [services, searchTerm]);

  const purchaseColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'name',
        headerName: 'Item Name',
        flex: 2,
        checkboxSelection: true,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className="font-medium">{p.value}</span>
          </div>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        flex: 1,
        cellRenderer: (p: any) => {
          const categoryName = p.data.category?.name || 'Other';
          return (
            <div className="flex items-center h-full">
              <Badge variant="outline" className="font-normal">
                {categoryName}
              </Badge>
            </div>
          );
        },
      },
      {
        field: 'purchasePrice',
        headerName: 'Cost',
        flex: 1,
        cellRenderer: (props: any) => {
          const [visible, setVisible] = useState(false);
          const toggleVisibility = () => setVisible((prev) => !prev);
          const value = formatAmount(props.value);

          return (
            <div className="flex items-center justify-between px-2 w-full h-full group">
              <span className={cn('font-mono transition-all', !visible && 'blur-xs select-none')}>
                {visible ? value : '00.000'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={toggleVisibility}
              >
                {visible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </Button>
            </div>
          );
        },
      },
      {
        field: 'salesPrice',
        headerName: 'Selling Price',
        flex: 1,
        cellRenderer: (p: any) => (
          <span className="font-semibold text-primary">{formatAmount(p.value)}</span>
        ),
      },
      {
        headerName: '',
        width: 80,
        pinned: 'right',
        cellRenderer: (p: any) => (
          <div className="flex items-center justify-center h-full gap-1">
            <CreateItemDialog item={p.data} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              ></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this item?')) {
                      deleteMutation.mutate({ id: p.data.id });
                    }
                  }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete Item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  const serviceColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'name',
        headerName: 'Service Name',
        flex: 2,
        checkboxSelection: true,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            <span className="font-medium">{p.value}</span>
          </div>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        flex: 1,
        cellRenderer: (p: any) => {
          const categoryName = p.data.category?.name || 'Other';
          return (
            <div className="flex items-center h-full">
              <Badge variant="outline" className="font-normal">
                {categoryName}
              </Badge>
            </div>
          );
        },
      },
      {
        field: 'salesPrice',
        headerName: 'Rate',
        flex: 1,
        cellRenderer: (p: any) => (
          <span className="font-semibold text-primary">{formatAmount(p.value)}</span>
        ),
      },
      {
        headerName: '',
        width: 80,
        pinned: 'right',
        cellRenderer: (p: any) => (
          <div className="flex items-center justify-center h-full gap-1">
            <CreateItemDialog item={p.data} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              ></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this service?')) {
                      deleteMutation.mutate({ id: p.data.id });
                    }
                  }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete Service
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  const stats = useMemo(() => {
    const totalProducts = products?.length || 0;
    const totalServices = services?.length || 0;
    const avgProductPrice =
      products && products.length > 0
        ? products.reduce((acc, p) => acc + Number(p.salesPrice || 0), 0) / products.length
        : 0;

    return { totalProducts, totalServices, avgProductPrice };
  }, [products, services]);

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Items & Inventory"
        icon={<ShoppingBag className="size-5" />}
        rightContent={
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                className="pl-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CreateItemDialog>
              <Button className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Item</span>
              </Button>
            </CreateItemDialog>
          </div>
        }
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 p-4 md:p-6 space-y-6 overflow-auto"
      >
        {/* Stats Section - Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Package className="size-5 text-blue-500" />}
            description="Active stock items"
            color="blue"
          />
          <StatCard
            title="Total Services"
            value={stats.totalServices}
            icon={<Wrench className="size-5 text-orange-500" />}
            description="Service offerings"
            color="orange"
          />
          <StatCard
            title="Avg. Sale Price"
            value={formatAmount(stats.avgProductPrice)}
            icon={<TrendingUp className="size-5 text-emerald-500" />}
            description="Across all products"
            color="emerald"
          />
        </div>

        {/* Stats Section - Mobile Carousel */}
        <div className="block md:hidden">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              <CarouselItem className="pl-2 basis-[85%]">
                <StatCard
                  title="Products"
                  value={stats.totalProducts}
                  icon={<Package className="size-5 text-blue-500" />}
                  description="Active stock"
                  color="blue"
                />
              </CarouselItem>
              <CarouselItem className="pl-2 basis-[85%]">
                <StatCard
                  title="Services"
                  value={stats.totalServices}
                  icon={<Wrench className="size-5 text-orange-500" />}
                  description="Offerings"
                  color="orange"
                />
              </CarouselItem>
              <CarouselItem className="pl-2 basis-[85%]">
                <StatCard
                  title="Avg Price"
                  value={formatAmount(stats.avgProductPrice)}
                  icon={<TrendingUp className="size-5 text-emerald-500" />}
                  description="Average"
                  color="emerald"
                />
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>

        <Card className="pt-0 border-none shadow-xl bg-background/60 backdrop-blur-xl overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
          <Tabs
            defaultValue="purchase"
            className="w-full h-full flex flex-col"
            onValueChange={setActiveTab}
          >
            <div className=" border-b">
              <TabsList className="bg-transparent gap-6 h-12 p-0">
                <TabsTrigger
                  value="purchase"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 transition-all"
                >
                  <ShoppingCart className="size-4" />
                  Purchased Items
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 min-w-[20px] justify-center"
                  >
                    {stats.totalProducts}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 transition-all"
                >
                  <Wrench className="size-4" />
                  Service Definitions
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 min-w-[20px] justify-center"
                  >
                    {stats.totalServices}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 p-0 relative">
              <AnimatePresence mode="wait">
                <TabsContent
                  key={activeTab}
                  value="purchase"
                  className="m-0 h-full absolute inset-0"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="h-full"
                  >
                    <AgGridReact
                      rowData={filteredProducts}
                      loading={isProductsLoading}
                      columnDefs={purchaseColumnDefs}
                      animateRows={true}
                      theme={tableTheme}
                      rowSelection="multiple"
                      suppressCellFocus={true}
                      headerHeight={48}
                      rowHeight={52}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="services" className="m-0 h-full absolute inset-0">
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="h-full"
                  >
                    <AgGridReact
                      rowData={filteredServices}
                      loading={isServicesLoading}
                      columnDefs={serviceColumnDefs}
                      animateRows={true}
                      theme={tableTheme}
                      rowSelection="multiple"
                      suppressCellFocus={true}
                      headerHeight={48}
                      rowHeight={52}
                    />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, icon, description, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-none shadow-sm bg-card backdrop-blur-md hover:shadow-md transition-all group overflow-hidden relative">
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-1',
            color === 'blue' && 'bg-blue-500',
            color === 'orange' && 'bg-orange-500',
            color === 'emerald' && 'bg-emerald-500',
          )}
        />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn('p-2 rounded-xl transition-colors', colorClasses[color])}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
