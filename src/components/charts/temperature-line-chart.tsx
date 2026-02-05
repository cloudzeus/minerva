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
  ReferenceLine,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaThermometerHalf } from "react-icons/fa";

interface TemperatureLineChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
  minTemperature?: number | null;
  maxTemperature?: number | null;
}

export function TemperatureLineChart({
  data,
  title = "TEMPERATURE TRENDS",
  minTemperature,
  maxTemperature,
}: TemperatureLineChartProps) {
  // Prepare chart data: use top-level temperature, or derive from sensorData/payload (temperature / temperature_left / temperature_right)
  const chartData = data
    .map((d) => {
      let temp: number | null = d.temperature ?? null;
      if (temp === null) {
        const raw = d.sensorData || d.payload;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const t = parsed.temperature ?? parsed.temperature_left ?? parsed.temperature_right;
            if (typeof t === "number" && !isNaN(t)) temp = t;
          } catch {
            /* ignore */
          }
        }
      }
      return { timestamp: Number(d.dataTimestamp), temperature: temp, deviceName: d.deviceName };
    })
    .filter((d) => d.temperature !== null)
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
              tick={{ fill: "#000000", fontWeight: "bold", fontSize: "10px" }}
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
              tick={(props: any) => {
                const { x, y, payload } = props;
                const value = payload.value;
                const tolerance = 0.2;
                const isThreshold = 
                  (minTemperature !== null && minTemperature !== undefined && Math.abs(value - minTemperature) < tolerance) ||
                  (maxTemperature !== null && maxTemperature !== undefined && Math.abs(value - maxTemperature) < tolerance);
                
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill={isThreshold ? "#E60000" : "#000000"}
                      fontSize={isThreshold ? "11px" : "10px"}
                      fontWeight="bold"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip
              labelFormatter={(timestamp) =>
                format(new Date(timestamp as number), "PPpp")
              }
              formatter={(value: number) => [`${value.toFixed(1)}°C`, "Temperature"]}
              contentStyle={{ fontSize: "0.75rem" }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            {/* Min/Max Reference Lines - Red color for Temperature Alert */}
            {minTemperature !== null && minTemperature !== undefined && (
              <ReferenceLine
                y={minTemperature}
                stroke="#E60000"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Min: ${minTemperature.toFixed(1)}°C`,
                  position: "right",
                  fill: "#E60000",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            {maxTemperature !== null && maxTemperature !== undefined && (
              <ReferenceLine
                y={maxTemperature}
                stroke="#E60000"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Max: ${maxTemperature.toFixed(1)}°C`,
                  position: "right",
                  fill: "#E60000",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            <Line
              key="temperature"
              type="monotone"
              dataKey="temperature"
              stroke="#f97316"
              strokeWidth={2}
              activeDot={{ r: 6 }}
              name="Temperature"
              dot={(props: any) => {
                const { payload, cx, cy } = props;
                const value = payload.temperature;
                let fillColor = "#f97316";
                let strokeColor = "#f97316";
                if (value !== null && value !== undefined) {
                  if (minTemperature !== null && minTemperature !== undefined && value < minTemperature) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  } else if (maxTemperature !== null && maxTemperature !== undefined && value > maxTemperature) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  }
                }
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} fill={fillColor} stroke={strokeColor} strokeWidth={2} r={4} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

