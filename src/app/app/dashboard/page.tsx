import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { invoicesApi, customersApi, inventoryApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users,
  Package,
  FileText,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Stats {
  customers: number;
  inventory: number;
  invoices: number;
  revenue: number;
  cost: number;
  profit: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [custRes, invRes, invoiceRes, summaryRes] = await Promise.all([
          customersApi.list({ limit: "1" }),
          inventoryApi.list({ limit: "1" }),
          invoicesApi.list({ limit: "5" }),
          invoicesApi.summary(),
        ]);
        setStats({
          customers: custRes.total,
          inventory: invRes.total,
          invoices: invoiceRes.total,
          revenue: summaryRes.data?.totalRevenue ?? 0,
          cost: summaryRes.data?.totalCost ?? 0,
          profit: summaryRes.data?.grossProfit ?? 0,
        });
        setRecentInvoices(invoiceRes.invoices || []);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    {
      label: "Total Customers",
      value: stats?.customers ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/customers",
    },
    {
      label: "Inventory Items",
      value: stats?.inventory ?? 0,
      icon: Package,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      href: "/inventory",
    },
    {
      label: "Total Invoices",
      value: stats?.invoices ?? 0,
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      href: "/invoices",
    },
    {
      label: "Gross Profit",
      value: formatCurrency(stats?.profit ?? 0),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/invoices",
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — BizCore</title>
      </Head>
      <AppLayout>
        <PageHeader
          title={`Good day, ${user?.firstName} 👋`}
          description="Here's what's happening with your business today."
        />

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                  <Link key={card.label} href={card.href}>
                    <Card
                      className={`hover:shadow-md transition-all duration-200 cursor-pointer animate-in-up stagger-${i + 1}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              {card.label}
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {card.value}
                            </p>
                          </div>
                          <div
                            className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}
                          >
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Revenue summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Revenue",
                    value: stats?.revenue ?? 0,
                    variant: "default",
                  },
                  {
                    label: "Total Cost",
                    value: stats?.cost ?? 0,
                    variant: "muted",
                  },
                  {
                    label: "Gross Profit",
                    value: stats?.profit ?? 0,
                    variant: "success",
                  },
                ].map((item) => (
                  <Card key={item.label} className="animate-in-up stagger-4">
                    <CardContent className="p-5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        {item.label}
                      </p>
                      <p
                        className={`text-xl font-bold ${item.variant === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                      >
                        {formatCurrency(item.value)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent invoices */}
              <Card className="animate-in-up stagger-5">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Recent Invoices
                  </CardTitle>
                  <Link href="/invoices">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  {recentInvoices.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-10">
                      No invoices yet
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {recentInvoices.map((inv) => (
                        <Link key={inv.id} href={`/invoices/${inv.id}`}>
                          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Invoice #{inv.id}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.customer?.name ?? "No customer"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatDate(inv.date)}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                View
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AppLayout>
    </>
  );
}
