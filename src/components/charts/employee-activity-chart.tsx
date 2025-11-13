"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function EmployeeActivityChart() {
  const [data, setData] = useState<Array<{ day: string; hours: number }>>([]);

  useEffect(() => {
    // Simulated data - in production, fetch from API
    const mockData = [
      { day: "Mon", hours: 8 },
      { day: "Tue", hours: 7.5 },
      { day: "Wed", hours: 8.5 },
      { day: "Thu", hours: 8 },
      { day: "Fri", hours: 7 },
      { day: "Sat", hours: 0 },
      { day: "Sun", hours: 0 },
    ];
    setData(mockData);
  }, []);

  const chartConfig = {
    hours: {
      label: "Hours Worked",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="hours" fill="var(--color-hours)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

