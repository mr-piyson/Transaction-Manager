'use client';

import { TrendingUp } from 'lucide-react';
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';

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

export const description = 'A radial chart with stacked sections';

const chartData = [{ status: 'current', done: 15, pending: 110 }];

const chartConfig = {
  done: {
    label: 'Done',
    color: 'var(--chart-2)',
  },
  pending: {
    label: 'Pending',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export default function CountCarts() {
  // Updated to use the correct keys from chartData
  const totalTasks = chartData[0].done + chartData[0].pending;

  return (
    <Card className="flex flex-1 flex-col ">
      <CardHeader className="items-center pb-0">
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Total Invoices</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[250px] mb-[-90px]"
        >
          {/* Note: innerRadius and outerRadius adjusted for better fit */}
          <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={130}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />

            <RadialBar
              dataKey="done"
              fill="var(--color-done)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="pending"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-pending)"
              className="stroke-transparent stroke-2"
            />

            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalTasks.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground"
                        >
                          Tasks
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium"></div>
        <div className="leading-none text-muted-foreground">Showing total Invoices</div>
      </CardFooter>
    </Card>
  );
}
