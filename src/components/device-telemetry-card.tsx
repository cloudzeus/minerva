"use client";

import * as React from "react";
import { MilesightDeviceTelemetry, Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from "date-fns";
import {
  FaThermometerHalf,
  FaMicrochip,
  FaCircle,
  FaTint,
  FaBatteryHalf,
  FaServer,
  FaWifi,
  FaBolt,
  FaChartLine,
} from "react-icons/fa";
import { ExportTelemetryButton } from "./export-telemetry-button";

interface DeviceTelemetryCardProps {
  deviceName: string;
  deviceId: string;
  deviceStatus?: string;
  deviceType?: string;
  deviceModel?: string;
  telemetryData: MilesightDeviceTelemetry[];
  userRole?: Role;
}

// Icon mapping for common sensor properties
const propertyIcons: Record<string, { icon: any; color: string; unit?: string }> = {
  temperature: { icon: FaThermometerHalf, color: "text-orange-500", unit: "°C" },
  temperature_left: { icon: FaThermometerHalf, color: "text-orange-500", unit: "°C" },
  temperature_right: { icon: FaThermometerHalf, color: "text-orange-600", unit: "°C" },
  humidity: { icon: FaTint, color: "text-blue-500", unit: "%" },
  battery: { icon: FaBatteryHalf, color: "text-green-500", unit: "%" },
  electricity: { icon: FaBatteryHalf, color: "text-green-500", unit: "%" },
  voltage: { icon: FaBolt, color: "text-yellow-500", unit: "V" },
  current: { icon: FaBolt, color: "text-yellow-600", unit: "A" },
  power: { icon: FaBolt, color: "text-red-500", unit: "W" },
  signal: { icon: FaWifi, color: "text-purple-500", unit: "dBm" },
  rssi: { icon: FaWifi, color: "text-purple-500", unit: "dBm" },
  snr: { icon: FaWifi, color: "text-purple-600", unit: "dB" },
};

// Charts use CSS variables from shadcn theme: hsl(var(--chart-1)) through hsl(var(--chart-5))

export function DeviceTelemetryCard({
  deviceName,
  deviceId,
  deviceStatus = "ONLINE",
  deviceType,
  deviceModel,
  telemetryData,
  userRole,
}: DeviceTelemetryCardProps) {
  const [timeRange, setTimeRange] = React.useState("1h");
  
  // Only admins and managers can export
  const canExport = userRole === Role.ADMIN || userRole === Role.MANAGER;

  // Get latest reading - safely handle empty array
  const latestReading = telemetryData.length > 0 ? telemetryData[0] : null;
  
  // Detect all available properties dynamically - FILTER OUT garbage
  const allProperties = React.useMemo(() => {
    const props = new Set<string>();
    const GARBAGE_PROPS = ["mutation", "temperature"]; // Generic "temperature" without _left/_right is garbage
    
    telemetryData.forEach((d) => {
      if (d.sensorData) {
        const sensorData = JSON.parse(d.sensorData);
        Object.keys(sensorData).forEach((key) => {
          const value = sensorData[key];
          const keyLower = key.toLowerCase();
          
          // Only include numeric values AND exclude garbage properties
          if (typeof value === "number" && !GARBAGE_PROPS.includes(keyLower)) {
            props.add(key);
          }
        });
      }
    });
    const propsArray = Array.from(props);
    console.log(`[${deviceName}] Valid properties (garbage filtered):`, propsArray);
    return propsArray;
  }, [telemetryData, deviceName]);

  // Get latest values for each property from database
  const latestValues = React.useMemo(() => {
    if (!latestReading?.sensorData) return {};
    return JSON.parse(latestReading.sensorData);
  }, [latestReading]);

  // Prepare chart data with ALL numeric properties
  const allData = React.useMemo(() => {
    return telemetryData
      .map((d) => {
        const sensorData = d.sensorData ? JSON.parse(d.sensorData) : {};
        const dataPoint: any = {
          timestamp: Number(d.dataTimestamp),
          date: new Date(Number(d.dataTimestamp)),
        };
        
        // Add all numeric properties to data point
        allProperties.forEach((prop) => {
          const value = sensorData[prop];
          if (typeof value === "number") {
            dataPoint[prop] = value;
          }
        });
        
        return dataPoint;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [telemetryData, allProperties]);

  // Filter by time range
  const now = Date.now();
  const timeRanges: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "all": Number.MAX_SAFE_INTEGER, // Show all data
  };
  
  const filteredData = timeRange === "all" 
    ? allData 
    : allData.filter((item) => {
        return now - item.timestamp <= timeRanges[timeRange];
      });

  // Always show 20 buckets (each bucket renders up to 2 bars: temp left/right)
  const chartData = React.useMemo(() => {
    const TARGET_BUCKETS = 20;

    if (filteredData.length === 0) {
      return [];
    }

    const rangeNow = Date.now();
    const rangeEnd =
      timeRange === "all"
        ? filteredData[filteredData.length - 1]?.timestamp ?? rangeNow
        : rangeNow;

    const defaultRangeStart = rangeEnd - TARGET_BUCKETS * 60 * 1000;
    const rangeStart =
      timeRange === "all"
        ? filteredData[0]?.timestamp ?? defaultRangeStart
        : rangeEnd - timeRanges[timeRange];

    const totalDuration = Math.max(rangeEnd - rangeStart, TARGET_BUCKETS);
    const bucketDuration = totalDuration / TARGET_BUCKETS;

    const buckets = Array.from({ length: TARGET_BUCKETS }).map((_, index) => {
      const bucketStart = rangeStart + index * bucketDuration;
      const bucketEnd = bucketStart + bucketDuration;
      const bucketMid = bucketStart + bucketDuration / 2;

      const bucketPoints = filteredData.filter(
        (item) => item.timestamp >= bucketStart && item.timestamp < bucketEnd
      );

      const bucketEntry: Record<string, any> = {
        timestamp: bucketMid,
      };

      allProperties.forEach((prop) => {
        const values = bucketPoints
          .map((point) => point[prop])
          .filter((value) => typeof value === "number");
        bucketEntry[prop] =
          values.length > 0
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : null;
      });

      return bucketEntry;
    });

    return buckets;
  }, [filteredData, timeRange, timeRanges, allProperties]);

  // Only show temperature_left and temperature_right in chart
  const hasTemperatureLeft = allProperties.includes("temperature_left");
  const hasTemperatureRight = allProperties.includes("temperature_right");

  // Chart configuration for shadcn
  const chartConfig = {
    temperature_left: {
      label: "Temperature Left",
      color: "hsl(var(--chart-1))",
    },
    temperature_right: {
      label: "Temperature Right", 
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  // Get the top 2 most important properties to display in sensor readings
  const displayProperties = React.useMemo(() => {
    // Priority: temperature_left, temperature_right
    const priority = ["temperature_left", "temperature_right"];
    const sorted = allProperties
      .filter(prop => priority.includes(prop))
      .sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    return sorted.slice(0, 2);
  }, [allProperties]);

  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-4 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FaMicrochip className="h-3.5 w-3.5 text-muted-foreground" />
            {deviceName || `Device ${deviceId}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={deviceStatus === "ONLINE" ? "default" : "secondary"}
              className="h-5 text-[8px]"
            >
              <FaCircle
                className={`mr-1 h-2 w-2 ${
                  deviceStatus === "ONLINE" ? "animate-pulse text-green-400" : "text-gray-400"
                }`}
              />
              {deviceStatus}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <ExportTelemetryButton
              deviceId={deviceId}
              variant="outline"
              size="sm"
            />
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[140px] text-xs rounded-lg sm:ml-auto"
              aria-label="Select a value"
            >
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1h" className="rounded-lg text-xs">
                Last 1 Hour
              </SelectItem>
              <SelectItem value="6h" className="rounded-lg text-xs">
                Last 6 Hours
              </SelectItem>
              <SelectItem value="24h" className="rounded-lg text-xs">
                Last 24 Hours
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg text-xs">
                Last 7 Days
              </SelectItem>
              <SelectItem value="all" className="rounded-lg text-xs">
                All Time
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-4 pt-0 sm:px-6 sm:pb-6">
        {allProperties.length === 0 ? (
          /* No Data Available */
          <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
            <div className="text-center">
              <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <FaMicrochip className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No telemetry data yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Waiting for webhook events...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Current Sensor Readings - Top 2 Properties */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              {displayProperties.map((prop) => {
                const value = latestValues[prop];
                const config = propertyIcons[prop] || {
                  icon: FaChartLine,
                  color: "text-gray-500",
                  unit: "",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={prop}
                    className="flex flex-col rounded-lg border border-border/40 bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {prop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                      <div className="mt-1 text-lg font-bold">
                      {value !== null && value !== undefined
                        ? `${typeof value === "number" ? value.toFixed(1) : value}${config.unit || ""}`
                        : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Temperature Bar Chart - Multiple */}
            {chartData.length > 0 && (hasTemperatureLeft || hasTemperatureRight) ? (
              <ChartContainer config={chartConfig}>
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    minTickGap={20}
                    tickFormatter={(value) => {
                      try {
                        const timestamp = Number(value);
                        if (!timestamp || isNaN(timestamp)) return "";
                        const date = new Date(timestamp);
                        if (isNaN(date.getTime())) return "";

                        const bucketLabelDuration =
                          Math.max(
                            timeRange === "all"
                              ? (filteredData[filteredData.length - 1]
                                  ?.timestamp || timestamp) -
                                  (filteredData[0]?.timestamp || timestamp)
                              : timeRanges[timeRange],
                            1
                          ) / 20;

                        if (bucketLabelDuration <= 60 * 60 * 1000) {
                          return format(date, "HH:mm");
                        }
                        if (bucketLabelDuration <= 24 * 60 * 60 * 1000) {
                          return format(date, "MMM d HH:mm");
                        }
                        return format(date, "MMM d");
                      } catch (error) {
                        return "";
                      }
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    label={{
                      value: "Temperature (°C)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: "0.75rem" },
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[200px]"
                        labelFormatter={(value, payload) => {
                          if (!payload || !payload[0]) return "";
                          const dataPoint = payload[0].payload;
                          if (!dataPoint || !dataPoint.date) return "";
                          return format(dataPoint.date, "MMM dd, yyyy HH:mm");
                        }}
                      />
                    }
                  />
                  {hasTemperatureLeft && (
                    <Bar dataKey="temperature_left" fill="var(--color-temperature_left)" radius={4} />
                  )}
                  {hasTemperatureRight && (
                    <Bar dataKey="temperature_right" fill="var(--color-temperature_right)" radius={4} />
                  )}
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
                <div className="text-center">
                  <FaChartLine className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No chart data available</p>
                </div>
              </div>
            )}

            {/* All Properties List */}
            {allProperties.length > 0 && (
              <details className="group mt-4 rounded-lg border border-border/40 bg-muted/20 p-4" open>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span className="inline-flex items-center gap-2">
                    All Sensor Properties
                    <Badge variant="secondary" className="ml-1 h-5">
                      {allProperties.length}
                    </Badge>
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {allProperties.map((prop) => {
                    const value = latestValues[prop];
                    const config = propertyIcons[prop] || { icon: FaChartLine, color: "text-gray-500", unit: "" };
                    const Icon = config.icon;
                    
                    return (
                      <div key={prop} className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span className="text-xs text-muted-foreground">
                            {prop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold">
                          {value !== null && value !== undefined && value !== ""
                            ? `${typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}${config.unit || ""}`
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

