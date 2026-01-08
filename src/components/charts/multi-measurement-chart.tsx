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
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaChartLine } from "react-icons/fa";

interface MultiMeasurementChartProps {
  data: MilesightDeviceTelemetry[];
  title?: string;
  minTemperatureCH1?: number | null;
  maxTemperatureCH1?: number | null;
  minTemperatureCH2?: number | null;
  maxTemperatureCH2?: number | null;
  sensorNameCH1?: string | null;
  sensorNameCH2?: string | null;
}

export function MultiMeasurementChart({
  data,
  title = "ALL MEASUREMENTS",
  minTemperatureCH1,
  maxTemperatureCH1,
  minTemperatureCH2,
  maxTemperatureCH2,
  sensorNameCH1,
  sensorNameCH2,
}: MultiMeasurementChartProps) {
  const leftSensorLabel = sensorNameCH1 || "CH1";
  const rightSensorLabel = sensorNameCH2 || "CH2";
  // Debug: Log received temperature thresholds
  console.log("[MultiMeasurementChart] Received thresholds:", {
    minTemperatureCH1,
    maxTemperatureCH1,
    minTemperatureCH2,
    maxTemperatureCH2,
  });

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
      <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
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
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
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
              tick={{ fill: "#000000", fontWeight: "bold", fontSize: "10px" }}
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
              tick={(props: any) => {
                const { x, y, payload } = props;
                const value = payload.value;
                const tolerance = 0.2;
                
                // Check which threshold this matches and use appropriate color
                let thresholdColor = "#000000";
                let isThreshold = false;
                
                if (minTemperatureCH1 !== null && minTemperatureCH1 !== undefined && Math.abs(value - minTemperatureCH1) < tolerance) {
                  thresholdColor = "#fb923c"; // CH1 orange
                  isThreshold = true;
                } else if (maxTemperatureCH1 !== null && maxTemperatureCH1 !== undefined && Math.abs(value - maxTemperatureCH1) < tolerance) {
                  thresholdColor = "#fb923c"; // CH1 orange
                  isThreshold = true;
                } else if (minTemperatureCH2 !== null && minTemperatureCH2 !== undefined && Math.abs(value - minTemperatureCH2) < tolerance) {
                  thresholdColor = "#16a34a"; // CH2 green
                  isThreshold = true;
                } else if (maxTemperatureCH2 !== null && maxTemperatureCH2 !== undefined && Math.abs(value - maxTemperatureCH2) < tolerance) {
                  thresholdColor = "#16a34a"; // CH2 green
                  isThreshold = true;
                }
                
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill={thresholdColor}
                      fontSize={isThreshold ? "11px" : "10px"}
                      fontWeight="bold"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              }}
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
            
            {/* Temperature Alert Reference Lines for CH1 - Orange color */}
            {minTemperatureCH1 !== null && minTemperatureCH1 !== undefined && !isNaN(minTemperatureCH1) && (
              <ReferenceLine
                yAxisId="temp"
                y={minTemperatureCH1}
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${leftSensorLabel} Min: ${minTemperatureCH1.toFixed(1)}°C`,
                  position: "right",
                  fill: "#fb923c",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            {maxTemperatureCH1 !== null && maxTemperatureCH1 !== undefined && !isNaN(maxTemperatureCH1) && (
              <ReferenceLine
                yAxisId="temp"
                y={maxTemperatureCH1}
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${leftSensorLabel} Max: ${maxTemperatureCH1.toFixed(1)}°C`,
                  position: "right",
                  fill: "#fb923c",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            {/* Temperature Alert Reference Lines for CH2 - Green color */}
            {minTemperatureCH2 !== null && minTemperatureCH2 !== undefined && !isNaN(minTemperatureCH2) && (
              <ReferenceLine
                yAxisId="temp"
                y={minTemperatureCH2}
                stroke="#16a34a"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${rightSensorLabel} Min: ${minTemperatureCH2.toFixed(1)}°C`,
                  position: "right",
                  fill: "#16a34a",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            {maxTemperatureCH2 !== null && maxTemperatureCH2 !== undefined && !isNaN(maxTemperatureCH2) && (
              <ReferenceLine
                yAxisId="temp"
                y={maxTemperatureCH2}
                stroke="#16a34a"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${rightSensorLabel} Max: ${maxTemperatureCH2.toFixed(1)}°C`,
                  position: "right",
                  fill: "#16a34a",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
                ifOverflow="extendDomain"
              />
            )}
            
            {/* Temperature lines */}
            <Line
              key="temperature"
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Temperature"
            />
            <Line
              key="temperature_left"
              yAxisId="temp"
              type="monotone"
              dataKey="temperature_left"
              stroke="#fb923c"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Temp Left"
              dot={(props: any) => {
                const { payload, cx, cy } = props;
                const value = payload.temperature_left;
                let fillColor = "#fb923c";
                let strokeColor = "#fb923c";
                if (value !== null && value !== undefined) {
                  if (minTemperatureCH1 !== null && minTemperatureCH1 !== undefined && value < minTemperatureCH1) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  } else if (maxTemperatureCH1 !== null && maxTemperatureCH1 !== undefined && value > maxTemperatureCH1) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  }
                }
                return <circle key={`dot-left-${cx}-${cy}`} cx={cx} cy={cy} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} r={2} />;
              }}
            />
            <Line
              key="temperature_right"
              yAxisId="temp"
              type="monotone"
              dataKey="temperature_right"
              stroke="#16a34a"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Temp Right"
              dot={(props: any) => {
                const { payload, cx, cy } = props;
                const value = payload.temperature_right;
                let fillColor = "#16a34a";
                let strokeColor = "#16a34a";
                if (value !== null && value !== undefined) {
                  if (minTemperatureCH2 !== null && minTemperatureCH2 !== undefined && value < minTemperatureCH2) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  } else if (maxTemperatureCH2 !== null && maxTemperatureCH2 !== undefined && value > maxTemperatureCH2) {
                    fillColor = "#E60000";
                    strokeColor = "#E60000";
                  }
                }
                return <circle key={`dot-right-${cx}-${cy}`} cx={cx} cy={cy} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} r={2} />;
              }}
            />
            
            {/* Humidity and Battery lines */}
            <Line
              key="humidity"
              yAxisId="other"
              type="monotone"
              dataKey="humidity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Humidity (%)"
            />
            <Line
              key="battery"
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

