'use client';

// These were unused or migrated to sub-components
import { LayoutDashboard } from 'lucide-react';
import { Header } from '../App-Header';
import { CardsSection } from './cards-section';
import { ChartAreaInteractive } from './AreaChart';
import { AnalyticsDashboard } from './Charts';

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
          <div className="flex flex-col gap-4">
            <ChartAreaInteractive />
            <AnalyticsDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
