'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useInvoices } from '@/hooks/data/use-invoices';
import { useCustomers } from '@/hooks/data/use-customers';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Users,
  Loader2,
  CalendarDays,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { Format } from '@/lib/format';
import { Header } from '../App-Header';
import { CardsSection } from './cards-section';
import CountCarts from './CountCart';
import { ContractExpirationChart } from './countDownCart';

export default function Dashboard() {
  return (
    <>
      <Header
        title="Financial Dashboard"
        icon={<LayoutDashboard className="w-4 h-4" />}
        sticky={true}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <CardsSection />
            <div className="flex flex-col md:flex-row gap-4 px-4">
              <CountCarts />
              <CountCarts />
              <ContractExpirationChart />
              {/* <ChartAreaInteractive /> */}
            </div>
            {/* <DataTable data={data} /> */}
          </div>
        </div>
      </div>
    </>
  );
}
