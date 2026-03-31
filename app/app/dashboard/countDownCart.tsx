'use client';

import { AlertTriangle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

// Mock data representing contracts and days until expiration
const chartData = [
  { contract: 'Cloud Services', days: 12, category: 'IT' },
  { contract: 'Office Lease', days: 28, category: 'Facilities' },
  { contract: 'Security Fleet', days: 45, category: 'Operations' },
  { contract: 'Health Insurance', days: 62, category: 'HR' },
  { contract: 'Catering Vendor', days: 88, category: 'Events' },
  { contract: 'Software CRM', days: 110, category: 'Sales' },
];

const chartConfig = {
  days: {
    label: 'Days Remaining',
    color: 'hsl(var(--chart-1))',
  },
  label: {
    color: 'var(--background)',
  },
} satisfies ChartConfig;

export function ContractExpirationChart() {
  return (
    <Card className="flex-2 max-w-2xl">
      <CardHeader>
        <CardTitle>Upcoming Contract Expirations</CardTitle>
        <CardDescription>Contracts expiring within the next 120 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 45, // Increased margin for the "X days" label
              left: 10,
            }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <YAxis
              dataKey="contract"
              type="category"
              hide // Keep hidden for the clean look you had
            />
            <XAxis dataKey="days" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar
              dataKey="days"
              fill="var(--color-secondary)"
              radius={[0, 4, 4, 0]} // Rounded corners on the right side only
            >
              {/* Inside Label: Contract Name */}
              <LabelList
                dataKey="contract"
                position="insideLeft"
                offset={12}
                className="fill-white font-medium"
                fontSize={12}
              />
              {/* Outside Label: Number of Days */}
              <LabelList
                dataKey="days"
                position="right"
                offset={10}
                // @ts-ignore
                formatter={(value: number) => `${value} d`}
                className="fill-foreground font-bold"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" /> 2 contracts require immediate renewal
        </div>
        <div className="leading-none text-muted-foreground">
          Data synced with Procurement Portal as of March 2026
        </div>
      </CardFooter>
    </Card>
  );
}
