"use client";

import { TrendingUp } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  {
    month: "current",
    completed: 142,
    pending: 89,
    "in-progress": 67,
    "on-hold": 34,
  },
];

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(142, 76%, 36%)",
  },
  pending: {
    label: "Pending",
    color: "hsl(48, 96%, 53%)",
  },
  "in-progress": {
    label: "In Progress",
    color: "hsl(221, 83%, 53%)",
  },
  "on-hold": {
    label: "On Hold",
    color: "hsl(25, 95%, 53%)",
  },
} satisfies ChartConfig;

export function ChartExample() {
  const totalTickets =
    chartData[0].completed +
    chartData[0].pending +
    chartData[0]["in-progress"] +
    chartData[0]["on-hold"];

  return (
    <Card className="flex flex-col grid-cols-1 ">
      <CardHeader className="items-center pb-0">
        <CardTitle>Ticket Status Overview</CardTitle>
        <CardDescription>
          Current ticket distribution across all statuses
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[200px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={130}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalTickets.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground"
                        >
                          Total Tickets
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="completed"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-completed)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="pending"
              fill="var(--color-pending)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="in-progress"
              fill="var(--color-in-progress)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="on-hold"
              fill="var(--color-on-hold)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4 w-full">
          {Object.entries(chartConfig).map(([key, config]) => {
            const value = chartData[0][
              key as keyof (typeof chartData)[0]
            ] as number;
            const percentage = Math.round((value / totalTickets) * 100);

            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <div className="text-xs">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-muted-foreground ml-1">({value})</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardFooter>
    </Card>
  );
}
