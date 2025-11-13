"use client";

import * as React from "react";
import { MilesightDeviceTelemetry } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from "date-fns";
import { FaThermometerHalf, FaMicrochip, FaCircle, FaFileExcel } from "react-icons/fa";
import { ExportTelemetryButton } from "./export-telemetry-button";

interface DeviceTelemetryCardProps {
  deviceName: string;
  deviceId: string;
  deviceStatus?: string;
  telemetryData: MilesightDeviceTelemetry[];
}

const chartConfig = {
  temperatureLeft: {
    label: "Temp Left",
    color: "#f97316",
  },
  temperatureRight: {
    label: "Temp Right",
    color: "#fb923c",
  },
} satisfies ChartConfig;

export function DeviceTelemetryCard({
  deviceName,
  deviceId,
  deviceStatus = "ONLINE",
  telemetryData,
}: DeviceTelemetryCardProps) {
  const [timeRange, setTimeRange] = React.useState("24h");

  // Get latest reading - safely handle empty array
  const latestReading = telemetryData.length > 0 ? telemetryData[0] : null;

  // Prepare temperature chart data with left & right sensors
  const allData = telemetryData
    .map((d) => {
      const sensorData = d.sensorData ? JSON.parse(d.sensorData) : {};
      return {
        timestamp: Number(d.dataTimestamp),
        date: new Date(Number(d.dataTimestamp)),
        temperatureLeft: sensorData.temperature_left || d.temperature || null,
        temperatureRight: sensorData.temperature_right || null,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  // Filter by time range
  const now = Date.now();
  const timeRanges: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  
  const filteredData = allData.filter((item) => {
    return now - item.timestamp <= timeRanges[timeRange];
  });

  const temperatureData = filteredData.length > 0 ? filteredData : allData.slice(-50);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-3 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="flex items-center gap-2 text-sm uppercase">
            <FaMicrochip className="h-4 w-4 text-purple-500" />
            {deviceName || `Device ${deviceId}`}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            <Badge
              variant={deviceStatus === "ONLINE" ? "default" : "secondary"}
              className="gap-1 text-xs"
            >
              <FaCircle
                className={`h-2 w-2 ${
                  deviceStatus === "ONLINE" ? "text-green-500" : "text-gray-500"
                }`}
              />
              {deviceStatus}
            </Badge>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <ExportTelemetryButton
            deviceId={deviceId}
            variant="outline"
            size="sm"
          />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[120px] rounded-lg text-xs"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 24h" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1h" className="rounded-lg text-xs">
                Last 1 hour
              </SelectItem>
              <SelectItem value="6h" className="rounded-lg text-xs">
                Last 6 hours
              </SelectItem>
              <SelectItem value="24h" className="rounded-lg text-xs">
                Last 24 hours
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg text-xs">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-2 pt-4 sm:px-4 sm:pt-4">
        {/* Current Sensor Readings */}
        <div className="grid grid-cols-2 gap-3">
          {/* Temperature Left */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
            <FaThermometerHalf className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground uppercase">Temp Left</div>
              <div className="text-base font-bold">
                {latestReading && temperatureData[temperatureData.length - 1]?.temperatureLeft
                  ? `${temperatureData[temperatureData.length - 1].temperatureLeft.toFixed(1)}°C`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Temperature Right */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
            <FaThermometerHalf className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-xs text-muted-foreground uppercase">Temp Right</div>
              <div className="text-base font-bold">
                {latestReading && temperatureData[temperatureData.length - 1]?.temperatureRight
                  ? `${temperatureData[temperatureData.length - 1].temperatureRight.toFixed(1)}°C`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Area Chart */}
        {temperatureData.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <AreaChart data={temperatureData}>
              <defs>
                <linearGradient id={`fillTempLeft-${deviceId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-temperatureLeft)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-temperatureLeft)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id={`fillTempRight-${deviceId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-temperatureRight)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-temperatureRight)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return format(new Date(value), "HH:mm");
                }}
                style={{ fontSize: "0.65rem" }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return format(new Date(value as number), "PPpp");
                    }}
                    indicator="dot"
                    formatter={(value, name) => [
                      `${Number(value).toFixed(1)}°C`,
                      name,
                    ]}
                  />
                }
              />
              <Area
                dataKey="temperatureLeft"
                type="natural"
                fill={`url(#fillTempLeft-${deviceId})`}
                stroke="var(--color-temperatureLeft)"
                stackId="a"
              />
              <Area
                dataKey="temperatureRight"
                type="natural"
                fill={`url(#fillTempRight-${deviceId})`}
                stroke="var(--color-temperatureRight)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            No temperature data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

