"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function AdminActivityChart() {
  const [data, setData] = useState<Array<{ date: string; activities: number }>>([]);

  useEffect(() => {
    // Simulated data - in production, fetch from API
    const mockData = [
      { date: "Mon", activities: 12 },
      { date: "Tue", activities: 19 },
      { date: "Wed", activities: 15 },
      { date: "Thu", activities: 25 },
      { date: "Fri", activities: 22 },
      { date: "Sat", activities: 8 },
      { date: "Sun", activities: 10 },
    ];
    setData(mockData);
  }, []);

  const chartConfig = {
    activities: {
      label: "Activities",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="activities"
          stroke="var(--color-activities)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  );
}

