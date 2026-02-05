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
import { FaBatteryHalf } from "react-icons/fa";

interface BatteryLineChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
}

export function BatteryLineChart({
  data,
  title = "BATTERY LEVEL TRENDS",
}: BatteryLineChartProps) {
  // Prepare chart data: use top-level battery, or derive from sensorData/payload (battery / battery_level / electricity)
  const chartData = data
    .map((d) => {
      let bat: number | null = d.battery !== null && d.battery !== undefined ? d.battery : null;
      if (bat === null) {
        const raw = d.sensorData || d.payload;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const b = parsed.battery ?? parsed.battery_level ?? parsed.batteryLevel ?? parsed.electricity;
            if (typeof b === "number" && !isNaN(b)) bat = Math.round(b);
            else if (typeof b === "string" && b.trim() !== "") bat = parseInt(b, 10);
          } catch {
            /* ignore */
          }
        }
      }
      return { timestamp: Number(d.dataTimestamp), battery: bat, deviceName: d.deviceName };
    })
    .filter((d) => d.battery !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase">
            <FaBatteryHalf className="h-4 w-4 text-green-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            No battery data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase">
          <FaBatteryHalf className="h-4 w-4 text-green-500" />
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
              domain={[0, 100]}
              label={{
                value: "Battery (%)",
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
              formatter={(value: number) => [`${value}%`, "Battery"]}
              contentStyle={{ fontSize: "0.75rem" }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Line
              key="battery"
              type="monotone"
              dataKey="battery"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 4 }}
              activeDot={{ r: 6 }}
              name="Battery Level"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

