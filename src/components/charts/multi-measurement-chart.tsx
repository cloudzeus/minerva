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
import { FaChartLine } from "react-icons/fa";

interface MultiMeasurementChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
}

export function MultiMeasurementChart({
  data,
  title = "ALL MEASUREMENTS",
}: MultiMeasurementChartProps) {
  // Prepare chart data with all measurements
  const chartData = data
    .map((d) => {
      const parsed = d.sensorData ? JSON.parse(d.sensorData) : {};
      return {
        timestamp: Number(d.dataTimestamp),
        temperature: d.temperature,
        humidity: d.humidity,
        battery: d.battery,
        temperature_left: parsed.temperature_left,
        temperature_right: parsed.temperature_right,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase">
            <FaChartLine className="h-4 w-4 text-purple-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            No measurement data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase">
          <FaChartLine className="h-4 w-4 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
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
              yAxisId="temp"
              label={{
                value: "Temperature (°C)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "0.75rem" },
              }}
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              yAxisId="other"
              orientation="right"
              label={{
                value: "Humidity (%) / Battery (%)",
                angle: 90,
                position: "insideRight",
                style: { fontSize: "0.75rem" },
              }}
              style={{ fontSize: "0.75rem" }}
            />
            <Tooltip
              labelFormatter={(timestamp) =>
                format(new Date(timestamp as number), "PPpp")
              }
              contentStyle={{ fontSize: "0.75rem" }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            
            {/* Temperature lines */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Temperature"
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature_left"
              stroke="#fb923c"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              name="Temp Left"
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature_right"
              stroke="#fdba74"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              name="Temp Right"
            />
            
            {/* Humidity and Battery lines */}
            <Line
              yAxisId="other"
              type="monotone"
              dataKey="humidity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Humidity (%)"
            />
            <Line
              yAxisId="other"
              type="monotone"
              dataKey="battery"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="Battery (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

