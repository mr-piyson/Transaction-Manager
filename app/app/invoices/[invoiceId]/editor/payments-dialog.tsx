'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm, Controller } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { InvoiceWithDetails } from '@/app/api/invoices/[id]/route';
import { useCreatePayment, useDeletePayment } from '@/hooks/data/use-payments';
import PaymentCard from './payment-card';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Money } from '@/lib/money';
import { Banknote, Clock, CreditCard, HandCoinsIcon, Plus } from 'lucide-react';

type FormValues = {
  paymentType: 'CASH' | 'TRANSFER';
  amount: number;
};

interface PaymentDialogProps {
  children: React.ReactNode;
  invoice: InvoiceWithDetails;
}

export function PaymentDialog({ children, invoice }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const createPayment = useCreatePayment();

  const amountPaid = invoice.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
  const balanceDue = (invoice.total || 0) - amountPaid;

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      paymentType: 'CASH',
      amount: balanceDue || 0,
    },
  });

  const value = watch('paymentType');

  function onSubmit(data: FormValues) {
    if (data.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    createPayment.mutate(
      {
        invoiceId: invoice.id,
        method: data.paymentType,
        amount: Number(data.amount),
        date: new Date(),
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded successfully');
          reset();
          setActiveTab('list');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="rounded-t-2xl min-h-[85vh] max-h-[92vh] flex flex-col p-0 gap-0 sm:max-w-lg sm:mx-auto">
        <DrawerHeader className="px-5 pb-3 border-b border-border shrink-0">
          <DrawerTitle className="text-base">Payments</DrawerTitle>
          <DrawerDescription className="text-xs">
            Balance: <span className={cn('font-bold tabular-nums')}>{Money.format(balanceDue)}</span>
          </DrawerDescription>
        </DrawerHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col w-full p-4 flex-1 overflow-hidden">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="list" className="flex-1 gap-2">
              <Clock className="w-4 h-4" /> History
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 gap-2">
              <Plus className="w-4 h-4" /> Record
            </TabsTrigger>
          </TabsList>
          <Separator />
          <TabsContent value="list" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex-1 overflow-y-auto">
              {!invoice.payments || invoice.payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <CreditCard className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {invoice.payments.map((p) => (
                    <PaymentCard key={p.id} payment={p as any} />
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Summary */}
            <div className="shrink-0 px-2 py-4 bg-card border-t border-border space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Invoice Total</span>
                <span className="tabular-nums">{Money.format(invoice.total || 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-success-foreground">Total Paid</span>
                <span className="font-semibold text-success-foreground tabular-nums">{Money.format(amountPaid)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Balance Due</span>
                <span className="tabular-nums">{Money.format(balanceDue)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add" className="flex flex-col flex-1 overflow-y-auto pt-4 space-y-6">
            {/* <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Method
              </p>
              <div className="flex flex-wrap gap-2">
                <Tabs defaultValue={'cash'} className={'w-full'}>
                  <TabsList className={'w-full'}>
                    <TabsTrigger value={'cash'}>
                      <HandCoinsIcon /> Cash
                    </TabsTrigger>
                    <TabsTrigger value={'Transfer'}>
                      <CreditCard /> Transfer
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Amount
                </label>
                <Input type="number" className="h-10 border-primary border-2" />
              </div>
            </div>

            <Button className="w-full h-12 text-base font-semibold" disabled>
              Record Payment
            </Button> */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-10 border-primary border-2 pl-8 font-semibold text-lg" 
                    {...register('amount', { valueAsNumber: true })} 
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Payment Method</p>

                <RadioGroup
                  value={value}
                  onValueChange={(val) => setValue('paymentType', val as FormValues['paymentType'])}
                  className="grid grid-cols-2 gap-4"
                >
                  {/* CASH */}
                  <label
                    className={`relative rounded-xl border p-4 cursor-pointer transition
              ${
                value === 'CASH' ? 'border-success bg-success/10' : 'border-muted hover:bg-muted/50'
              }
            `}
                  >
                    <RadioGroupItem value="CASH" className="sr-only" />

                    {/* Icon (top-right, faded) */}
                    <Banknote className="absolute top-3 right-3 h-10 w-10 text-success-foreground opacity-50" />

                    <div className="space-y-1">
                      <div className="font-semibold text-success-foreground">Cash</div>
                      <div className="text-xs text-muted-foreground">Physical money</div>
                    </div>
                  </label>

                  {/* TRANSFER */}
                  <label
                    className={`relative rounded-xl border p-4 cursor-pointer transition
              ${value === 'TRANSFER' ? 'border-primary bg-primary/10' : 'border-muted hover:bg-muted/50'}
            `}
                  >
                    <RadioGroupItem value="TRANSFER" className="sr-only" />

                    {/* Icon */}
                    <CreditCard className="absolute top-3 right-3 h-10 w-10 text-primary opacity-50" />

                    <div className="space-y-1">
                      <div className="font-semibold text-primary">Transfer</div>
                      <div className="text-xs text-muted-foreground">Card, transfer</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={createPayment.isPending}>
                {createPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
