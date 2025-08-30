"use client";

import { useEffect, useRef } from "react";

export function InventoryChart() {
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
    const categories = [
      { name: "Parts", value: 45, color: "rgba(99, 102, 241, 0.8)" },
      { name: "Tools", value: 25, color: "rgba(14, 165, 233, 0.8)" },
      { name: "Consumables", value: 20, color: "rgba(249, 115, 22, 0.8)" },
      { name: "Accessories", value: 10, color: "rgba(168, 85, 247, 0.8)" },
    ];

    // Calculate total
    const total = categories.reduce((sum, category) => sum + category.value, 0);

    // Chart dimensions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pie chart
    let startAngle = 0;
    categories.forEach((category) => {
      const sliceAngle = (2 * Math.PI * category.value) / total;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = category.color;
      ctx.fill();

      // Draw label
      const labelAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${category.value}%`, labelX, labelY);

      startAngle += sliceAngle;
    });

    // Draw legend
    const legendX = 20;
    let legendY = canvas.height - 100;

    categories.forEach((category) => {
      // Draw color box
      ctx.fillStyle = category.color;
      ctx.fillRect(legendX, legendY, 15, 15);

      // Draw category name
      ctx.fillStyle = "#334155";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(category.name, legendX + 25, legendY + 7.5);

      legendY += 25;
    });
  }, []);

  return (
    <div className="h-[250px] w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
