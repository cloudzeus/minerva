"use client";

import { MilesightDeviceTelemetry } from "@prisma/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaTint } from "react-icons/fa";

interface HumidityLineChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
}

export function HumidityLineChart({
  data,
  title = "HUMIDITY TRENDS",
}: HumidityLineChartProps) {
  // Prepare chart data
  const chartData = data
    .filter((d) => d.humidity !== null)
    .map((d) => ({
      timestamp: Number(d.dataTimestamp),
      humidity: d.humidity,
      deviceName: d.deviceName,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase">
            <FaTint className="h-4 w-4 text-blue-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            No humidity data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase">
          <FaTint className="h-4 w-4 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) =>
                format(new Date(timestamp), "HH:mm")
              }
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              label={{
                value: "Humidity (%)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "0.75rem" },
              }}
              style={{ fontSize: "0.75rem" }}
            />
            <Tooltip
              labelFormatter={(timestamp) =>
                format(new Date(timestamp as number), "PPpp")
              }
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Humidity"]}
              contentStyle={{ fontSize: "0.75rem" }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Line
              type="monotone"
              dataKey="humidity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Humidity"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

