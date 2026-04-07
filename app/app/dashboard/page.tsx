'use client';

// These were unused or migrated to sub-components
import { LayoutDashboard } from 'lucide-react';
import { Header } from '../App-Header';
import { CardsSection } from './cards-section';
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
          {/* <div className="flex flex-row gap-4 p-2">
            <ContractExpirationChart />
          </div> */}
          {/* <DataTable data={data} /> */}
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
