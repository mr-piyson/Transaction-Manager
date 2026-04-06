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

// These were unused or migrated to sub-components
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
import { ChartAreaInteractive } from './AreaChart';
import { AnalyticsDashboard, ContractPipelineChart } from './Charts';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-dvh">
      <Header
        title="Financial Dashboard"
        icon={<LayoutDashboard className="w-4 h-4" />}
        sticky={true}
      />
      <div className="flex-1 overflow-auto">
        <div className="flex flex-1 flex-col overflow-hidden p-2">
          <CardsSection />
          <div className="flex flex-col md:flex-row gap-4 p-2">
            <ChartAreaInteractive />
          </div>
          <div className="flex flex-row gap-4 p-2">
            <ContractPipelineChart />
            <ContractExpirationChart />
          </div>
          {/* <DataTable data={data} /> */}
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
