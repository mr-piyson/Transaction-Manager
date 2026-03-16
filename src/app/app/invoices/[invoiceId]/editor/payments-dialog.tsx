"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Money } from "@/lib/money"; // Ensure this handles your currency logic
import { cn } from "@/lib/utils";
import { Clock, Coins, CreditCard, Globe, Plus, Trash2 } from "lucide-react";

interface Payment {
  id: string;
  method: "cash" | "card" | "cheque";
  amount: number;
  date: string;
  reference?: string;
  notes?: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: Payment[];
  total: number;
  onChange: (payments: Payment[]) => void;
  children: React.ReactNode;
}

const PAYMENT_METHODS = {
  cash: { label: "Cash", icon: "💵" },
  card: { label: "Transfer", icon: "💳" },
  cheque: { label: "Cheque", icon: "📝" },
} as const;

export function PaymentDialog({
  payments = [],
  total,
  onChange,
  children,
}: PaymentDialogProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="rounded-t-2xl min-h-[85vh] max-h-[92vh] flex flex-col p-0 gap-0 sm:max-w-lg sm:mx-auto">
        <DrawerHeader className="px-5 pb-3 border-b border-border shrink-0">
          <DrawerTitle className="text-base">Payments</DrawerTitle>
          <DrawerDescription className="text-xs">
            Balance: <span className={cn("font-bold tabular-nums")}>100</span>
          </DrawerDescription>
        </DrawerHeader>

        <Tabs
          defaultValue="list"
          className="flex flex-col w-full p-4 flex-1 overflow-hidden"
        >
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="list" className="flex-1 gap-2">
              <Clock className="w-4 h-4" /> History
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 gap-2">
              <Plus className="w-4 h-4" /> Record
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="list"
            className="flex-1 flex flex-col overflow-hidden mt-0"
          >
            <div className="flex-1 overflow-y-auto">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <CreditCard className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                payments.map((p, i) => {
                  const m = PAYMENT_METHODS[p.method] || PAYMENT_METHODS.cash;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-2 py-3 border-b border-border/40"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {m.label}{" "}
                          {p.reference && (
                            <span className="text-muted-foreground font-normal">
                              · #{p.reference}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.date}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">
                        {Money.format(p.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onChange(payments.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky Summary */}
            <div className="shrink-0 px-2 py-4 bg-card border-t border-border space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Invoice Total</span>
                <span className="tabular-nums">{Money.format(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600">Total Paid</span>
                <span className="font-semibold text-emerald-600 tabular-nums">
                  100
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Balance Due</span>
                <span className="tabular-nums">{100}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="add"
            className="flex flex-col flex-1 overflow-y-auto pt-4 space-y-6"
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Method
              </p>
              <div className="flex flex-wrap gap-2">
                <Tabs defaultValue={"cash"} className={"w-full"}>
                  <TabsList className={"w-full"}>
                    <TabsTrigger value={"cash"}>
                      <Coins /> Cash
                    </TabsTrigger>
                    <TabsTrigger value={"Transfer"}>
                      {" "}
                      <CreditCard /> Transfer
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Amount
                </label>
                <Input type="number" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Date
                </label>
                <Input type="date" className="h-10" />
              </div>
            </div>

            <Button className="w-full h-12 text-base font-semibold">
              Record Payment
            </Button>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
