"use client";

import * as React from "react";
import { MilesightDeviceTelemetry } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

// Color palette for dynamic chart lines
const chartColors = [
  "#f97316", "#fb923c", "#3b82f6", "#60a5fa", "#22c55e", "#4ade80",
  "#a855f7", "#c084fc", "#ef4444", "#f87171", "#14b8a6", "#2dd4bf",
];

export function DeviceTelemetryCard({
  deviceName,
  deviceId,
  deviceStatus = "ONLINE",
  deviceType,
  deviceModel,
  telemetryData,
}: DeviceTelemetryCardProps) {
  const [timeRange, setTimeRange] = React.useState("24h");

  // Get latest reading - safely handle empty array
  const latestReading = telemetryData.length > 0 ? telemetryData[0] : null;
  
  // Detect all available properties dynamically
  const allProperties = React.useMemo(() => {
    const props = new Set<string>();
    telemetryData.forEach((d) => {
      if (d.sensorData) {
        const sensorData = JSON.parse(d.sensorData);
        Object.keys(sensorData).forEach((key) => {
          const value = sensorData[key];
          // Only include numeric values for charting
          if (typeof value === "number") {
            props.add(key);
          }
        });
      }
    });
    return Array.from(props);
  }, [telemetryData]);

  // Get latest values for each property
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
  };
  
  const filteredData = allData.filter((item) => {
    return now - item.timestamp <= timeRanges[timeRange];
  });

  const chartData = filteredData.length > 0 ? filteredData : allData.slice(-50);

  // Build dynamic chart config
  const dynamicChartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    allProperties.forEach((prop, index) => {
      config[prop] = {
        label: prop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        color: chartColors[index % chartColors.length],
      };
    });
    return config;
  }, [allProperties]);

  // Get the top 2 most important properties to display
  const displayProperties = React.useMemo(() => {
    // Priority order: temperature > humidity > battery > voltage > others
    const priority = [
      "temperature_left", "temperature_right", "temperature",
      "humidity", "battery", "electricity",
      "voltage", "current", "power",
      "signal", "rssi", "snr",
    ];
    
    const sorted = allProperties.sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    return sorted.slice(0, 2);
  }, [allProperties]);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaMicrochip className="h-4 w-4 text-purple-500" />
              {deviceName || `Device ${deviceId}`}
            </CardTitle>
          </div>
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
        {allProperties.length === 0 ? (
          /* No Data Available */
          <div className="flex h-[250px] items-center justify-center rounded-lg border bg-muted/30">
            <div className="text-center">
              <FaMicrochip className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">
                No telemetry data yet
              </p>
              <p className="text-xs text-muted-foreground">
                Waiting for webhook events...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Current Sensor Readings - Top 2 Properties */}
            <div className="grid grid-cols-2 gap-3">
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
                    className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2"
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {prop.replace(/_/g, " ")}
                      </div>
                      <div className="text-base font-bold">
                        {value !== null && value !== undefined
                          ? `${typeof value === "number" ? value.toFixed(1) : value}${config.unit || ""}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Area Chart - All Properties */}
            {chartData.length > 0 ? (
              <ChartContainer
                config={dynamicChartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <AreaChart data={chartData}>
                  <defs>
                    {allProperties.map((prop, index) => (
                      <linearGradient
                        key={prop}
                        id={`fill-${prop}-${deviceId}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={chartColors[index % chartColors.length]}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartColors[index % chartColors.length]}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    ))}
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
                  <YAxis
                    tickLine={false}
                    axisLine={false}
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
                        formatter={(value, name) => {
                          const prop = name as string;
                          const unit = propertyIcons[prop]?.unit || "";
                          return [`${Number(value).toFixed(1)}${unit}`, dynamicChartConfig[prop]?.label || name];
                        }}
                      />
                    }
                  />
                  {allProperties.map((prop, index) => (
                    <Area
                      key={prop}
                      dataKey={prop}
                      type="natural"
                      fill={`url(#fill-${prop}-${deviceId})`}
                      stroke={chartColors[index % chartColors.length]}
                      stackId="a"
                    />
                  ))}
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                No data available
              </div>
            )}

            {/* All Properties List */}
            {allProperties.length > 2 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                  All Properties ({allProperties.length})
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {allProperties.map((prop) => {
                    const value = latestValues[prop];
                    const config = propertyIcons[prop] || { icon: FaChartLine, color: "text-gray-500" };
                    const Icon = config.icon;
                    
                    return (
                      <div key={prop} className="flex items-center justify-between rounded border bg-muted/30 p-2">
                        <div className="flex items-center gap-1">
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          <span className="text-xs text-muted-foreground">
                            {prop.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold">
                          {value !== null && value !== undefined
                            ? `${typeof value === "number" ? value.toFixed(1) : value}${config.unit || ""}`
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

