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
import { FaThermometerHalf } from "react-icons/fa";

interface TemperatureLineChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
}

export function TemperatureLineChart({
  data,
  title = "TEMPERATURE TRENDS",
}: TemperatureLineChartProps) {
  // Prepare chart data
  const chartData = data
    .filter((d) => d.temperature !== null)
    .map((d) => ({
      timestamp: Number(d.dataTimestamp),
      temperature: d.temperature,
      deviceName: d.deviceName,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase">
            <FaThermometerHalf className="h-4 w-4 text-orange-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            No temperature data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase">
          <FaThermometerHalf className="h-4 w-4 text-orange-500" />
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
                value: "Temperature (°C)",
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
              formatter={(value: number) => [`${value.toFixed(1)}°C`, "Temperature"]}
              contentStyle={{ fontSize: "0.75rem" }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: "#f97316", r: 4 }}
              activeDot={{ r: 6 }}
              name="Temperature"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

