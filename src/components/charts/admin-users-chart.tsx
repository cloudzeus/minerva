"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AdminUsersChartProps {
  data: Array<{ role: string; count: number }>;
}

export function AdminUsersChart({ data }: AdminUsersChartProps) {
  const chartConfig = {
    count: {
      label: "Users",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="role" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

