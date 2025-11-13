"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function ManagerTeamChart() {
  const [data, setData] = useState<Array<{ date: string; tasks: number }>>([]);

  useEffect(() => {
    // Simulated data - in production, fetch from API
    const mockData = [
      { date: "Mon", tasks: 45 },
      { date: "Tue", tasks: 52 },
      { date: "Wed", tasks: 48 },
      { date: "Thu", tasks: 61 },
      { date: "Fri", tasks: 55 },
      { date: "Sat", tasks: 30 },
      { date: "Sun", tasks: 28 },
    ];
    setData(mockData);
  }, []);

  const chartConfig = {
    tasks: {
      label: "Tasks Completed",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="tasks"
          stroke="var(--color-tasks)"
          fill="var(--color-tasks)"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ChartContainer>
  );
}

