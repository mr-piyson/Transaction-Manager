"use client";

import { useEffect, useRef } from "react";
import { BarChart, LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SalesChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Chart data
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const salesData = [
      12500, 15000, 18000, 16500, 21000, 22500, 25000, 23000, 26000, 24500,
      28000, 30000,
    ];
    const targetData = [
      15000, 17000, 19000, 20000, 22000, 24000, 26000, 28000, 29000, 30000,
      31000, 32000,
    ];

    // Chart dimensions
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    const barWidth = (width / months.length) * 0.6;
    const barSpacing = (width / months.length) * 0.4;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();

    // Draw grid lines
    const gridLines = 5;
    const gridStep = height / gridLines;
    const valueStep = Math.max(...salesData) / gridLines;

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let i = 1; i <= gridLines; i++) {
      const y = canvas.height - padding - gridStep * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);

      // Draw grid line values
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `$${Math.round((valueStep * i) / 1000)}k`,
        padding - 5,
        y + 3
      );
    }
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bars
    months.forEach((month, i) => {
      const x = padding + (barWidth + barSpacing) * i + barSpacing / 2;
      const barHeight = (salesData[i] / Math.max(...salesData)) * height;
      const y = canvas.height - padding - barHeight;

      // Draw bar
      ctx.fillStyle = "rgba(99, 102, 241, 0.8)";
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw month label
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(month, x + barWidth / 2, canvas.height - padding + 15);
    });

    // Draw target line
    ctx.beginPath();
    months.forEach((_, i) => {
      const x =
        padding + (barWidth + barSpacing) * i + barSpacing / 2 + barWidth / 2;
      const y =
        canvas.height -
        padding -
        (targetData[i] / Math.max(...targetData)) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw legend
    const legendX = canvas.width - 150;
    const legendY = padding + 20;

    // Sales bar
    ctx.fillStyle = "rgba(99, 102, 241, 0.8)";
    ctx.fillRect(legendX, legendY, 15, 15);
    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Actual Sales", legendX + 20, legendY + 12);

    // Target line
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 30);
    ctx.lineTo(legendX + 15, legendY + 30);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.fillText("Target", legendX + 20, legendY + 34);
  }, []);

  return (
    <div className="relative h-[300px] w-full">
      <div className="absolute right-0 top-0 flex space-x-2">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <BarChart className="h-4 w-4" />
          <span className="sr-only">Bar Chart</span>
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <LineChart className="h-4 w-4" />
          <span className="sr-only">Line Chart</span>
        </Button>
      </div>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
