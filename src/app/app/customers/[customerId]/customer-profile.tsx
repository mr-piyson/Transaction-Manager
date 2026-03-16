'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Phone, Mail, MapPin, FileText, History, CreditCard, ArrowLeft, Edit, User2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CustomerProfileProps {
  customerId: string;
}

export function CustomerProfile({ customerId }: CustomerProfileProps) {
  // Fetch Customer Data (includes Invoices via Prisma relation)
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/customers/${customerId}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) return <div>Customer not found.</div>;

  return (
    <div className="flex flex-col h-full bg-background pb-20 md:pb-6">
      {/* Top Header / Navigation */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/customers">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Customer Details</h1>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Primary Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className=" pt-6 text-center">
              <div className="flex gap-5">
                <Avatar className="size-16">
                  <AvatarImage
                    // src={data.image ?? ""}
                    alt={customer.name || 'image'}
                    loading="lazy"
                    style={{ transition: 'opacity 0.2s' }}
                  />
                  <AvatarFallback>
                    <User2 className="size-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col ">
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  <Badge variant="secondary" className="mt-2">
                    Customer ID: #{customer.id}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-left border-t pt-6">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="hover:underline" dir="ltr">
                    {customer.phone}
                  </a>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="hover:underline">
                      {customer.email}
                    </a>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats (Mobile Friendly) */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Orders</p>
                <p className="text-xl font-bold">{customer.invoices?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex gap-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                <Badge className="bg-success-foreground text-success ">Active</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Activity & History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="invoices" orientation="horizontal">
            <TabsList className="w-full justify-start border-b bg-transparent h-auto p-0 mb-4">
              <TabsTrigger value="invoices" className=" border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-4">
                Invoices
              </TabsTrigger>
              <TabsTrigger value="activity" className=" border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-4">
                Activity Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="mt-0 space-y-4">
              {customer.invoices?.length > 0 ? (
                customer.invoices.map((invoice: any) => (
                  <Card key={invoice.id} className="hover:border-primary/50 transition-colors">
                    <Link href={`/app/invoices/${invoice.id}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <FileText className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Invoice #{invoice.id}</p>
                            <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">BHD {invoice.total?.toFixed(3)}</p>
                          <Badge variant="outline" className="text-[10px]">
                            View
                          </Badge>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No transaction history found.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground text-center">Account created on {new Date(customer.createdAt).toLocaleDateString()}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
