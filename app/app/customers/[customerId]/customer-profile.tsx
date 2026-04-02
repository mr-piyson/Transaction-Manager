'use client';

import { Phone, Mail, MapPin, ArrowLeft, Edit, User2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc/client';

interface CustomerProfileProps {
  customerId: string;
}

export function CustomerProfile({ customerId }: CustomerProfileProps) {
  // Fetch Customer Data
  const { data: customer, isLoading } = trpc.customers.getCustomerById.useQuery({ id: Number(customerId) });

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
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Total Orders
                </p>
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
      </div>
    </div>
  );
}
