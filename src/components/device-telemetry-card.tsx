"use client";

import * as React from "react";
import { MilesightDeviceTelemetry, Role } from "@prisma/client";
import { useTimeRange } from "@/lib/time-range-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Label, Cell } from "recharts";
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
  sensorNameLeft?: string | null;
  sensorNameRight?: string | null;
  sensorDisplayOrder?: string[] | null; // Custom display order for sensor properties
  // Temperature thresholds from alert settings
  minTemperatureCH1?: number | null;
  maxTemperatureCH1?: number | null;
  minTemperatureCH2?: number | null;
  maxTemperatureCH2?: number | null;
}

// Icon mapping for common sensor properties
const propertyIcons: Record<string, { icon: any; color: string; unit?: string }> = {
  temperature: { icon: FaThermometerHalf, color: "text-orange-500", unit: "°C" },
  temperature_left: { icon: FaThermometerHalf, color: "text-orange-500", unit: "°C" },
  temperature_right: { icon: FaThermometerHalf, color: "text-orange-600", unit: "°C" },
  humidity: { icon: FaTint, color: "text-blue-500", unit: "%" },
  battery: { icon: FaBatteryHalf, color: "text-green-500", unit: "%" },
  battery_level: { icon: FaBatteryHalf, color: "text-green-500", unit: "%" },
  batteryLevel: { icon: FaBatteryHalf, color: "text-green-500", unit: "%" },
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
  sensorNameLeft,
  sensorNameRight,
  sensorDisplayOrder,
  minTemperatureCH1,
  maxTemperatureCH1,
  minTemperatureCH2,
  maxTemperatureCH2,
}: DeviceTelemetryCardProps) {
  // Use shared timeRange from context so all device cards stay in sync
  const { timeRange, setTimeRange } = useTimeRange();
  
  // Only admins and managers can export
  const canExport = userRole === Role.ADMIN || userRole === Role.MANAGER;

  // Get latest reading - safely handle empty array
  const latestReading = telemetryData.length > 0 ? telemetryData[0] : null;
  
  // Standard property order for consistent display
  const PROPERTY_ORDER = [
    "temperature_left",
    "temperature_right",
    "temperature",
    "humidity",
    "battery",
    "electricity",
    "voltage",
    "current",
    "power",
    "signal",
    "rssi",
    "snr",
  ];

  // Helper: get parsed sensor payload (sensorData or payload column) so devices with either format work
  const getSensorPayload = (d: MilesightDeviceTelemetry): Record<string, unknown> => {
    const raw = d.sensorData || d.payload;
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  // Detect all available properties dynamically - FILTER OUT garbage
  const allProperties = React.useMemo(() => {
    const props = new Set<string>();
    const GARBAGE_PROPS = ["mutation", "timestamp"]; // Exclude non-numeric / noise keys (timestamp is metadata)
    
    telemetryData.forEach((d) => {
      const payload = getSensorPayload(d);
      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        const keyLower = key.toLowerCase();
        if (typeof value === "number" && !GARBAGE_PROPS.includes(keyLower)) {
          props.add(key);
        }
      });
      
      // Top-level DB columns as fallback when payload missing or different structure
      if (d.temperature !== null && d.temperature !== undefined) {
        const hasTemp = Array.from(props).some(
          (p) => p === "temperature" || p === "temperature_left" || p === "temperature_right"
        );
        if (!hasTemp) props.add("temperature");
      }
      if (d.battery !== null && d.battery !== undefined) {
        const hasBattery = Array.from(props).some(
          (p) => p.toLowerCase().includes("battery") || p === "electricity"
        );
        if (!hasBattery) props.add("battery");
      }
    });
    
    // For dual-sensor devices (temperature_left / temperature_right), exclude generic "temperature" to avoid duplicate
    if (props.has("temperature_left") || props.has("temperature_right")) {
      props.delete("temperature");
    }
    
    // Use custom display order if provided, otherwise use default order
    if (sensorDisplayOrder && sensorDisplayOrder.length > 0) {
      // Filter custom order to only include properties that exist in the data
      const orderedProps = sensorDisplayOrder.filter(prop => props.has(prop));
      // Add any new properties that aren't in the custom order
      const otherProps = Array.from(props).filter(prop => !sensorDisplayOrder.includes(prop)).sort();
      const propsArray = [...orderedProps, ...otherProps];
      console.log(`[${deviceName}] Valid properties (using custom order):`, propsArray);
      return propsArray;
    }
    
    // Default: Sort properties: known properties first (in order), then others alphabetically
    const knownProps = PROPERTY_ORDER.filter(prop => props.has(prop));
    const otherProps = Array.from(props).filter(prop => !PROPERTY_ORDER.includes(prop)).sort();
    const propsArray = [...knownProps, ...otherProps];
    
    console.log(`[${deviceName}] Valid properties (garbage filtered, ordered):`, propsArray);
    return propsArray;
  }, [telemetryData, deviceName, sensorDisplayOrder]);

  // Get latest values for each property from database
  // Search through all telemetry data to find the most recent non-null value for each property
  const latestValues = React.useMemo(() => {
    const values: Record<string, any> = {};
    
    for (const reading of telemetryData) {
      const raw = reading.sensorData || reading.payload;
      if (raw) {
        try {
          const payload = JSON.parse(raw) as Record<string, unknown>;
          Object.keys(payload).forEach((key) => {
            const val = payload[key];
            if (!(key in values) && val !== null && val !== undefined && typeof val === "number" && !isNaN(val)) {
              values[key] = val;
            }
          });
        } catch (e) {
          console.error(`[${deviceName}] Failed to parse sensor payload:`, e);
        }
      }
      
      // Also check database battery field if available (fallback)
      if (reading.battery !== null && reading.battery !== undefined) {
        // Use battery field if not already in values (check all variations)
        const hasBattery = Object.keys(values).some(k => 
          k.toLowerCase().includes("battery") || k === "electricity"
        );
        if (!hasBattery) {
          values.battery = reading.battery;
          break; // Found battery, no need to continue
        }
      }
    }
    
    return values;
  }, [telemetryData, deviceName]);

  // Get battery percentage and capacity from sensor data - check all possible field names
  const batteryInfo = React.useMemo(() => {
    const raw = latestReading?.sensorData || latestReading?.payload;
    if (!raw) {
      if (latestReading?.battery !== null && latestReading?.battery !== undefined) {
        return { percentage: latestReading.battery, capacity: null };
      }
      return { percentage: null, capacity: null };
    }
    const sensorData = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    
    // Check for battery percentage in various field names
    const batteryPercentage = 
      sensorData.battery ||
      sensorData.battery_level ||
      sensorData.batteryLevel ||
      sensorData.electricity ||
      latestReading?.battery ||
      null;
    
    // Check for battery capacity in various field names
    const batteryCapacity = 
      sensorData.batteryCapacity ||
      sensorData.battery_capacity ||
      sensorData.batteryCapacity ||
      sensorData.capacity ||
      null;
    
    return { 
      percentage: batteryPercentage !== null && batteryPercentage !== undefined ? Number(batteryPercentage) : null,
      capacity: batteryCapacity !== null && batteryCapacity !== undefined ? Number(batteryCapacity) : null
    };
  }, [latestReading]);

  // Prepare chart data with ALL numeric properties (use payload or top-level DB columns)
  const allData = React.useMemo(() => {
    return telemetryData
      .map((d) => {
        const payload = getSensorPayload(d);
        const dataPoint: any = {
          timestamp: Number(d.dataTimestamp),
          date: new Date(Number(d.dataTimestamp)),
        };
        allProperties.forEach((prop) => {
          let value = payload[prop];
          if (typeof value !== "number" || isNaN(value)) {
            if (prop === "temperature" && d.temperature != null) value = d.temperature;
            else if ((prop === "battery" || prop === "battery_level") && d.battery != null) value = d.battery;
          }
          dataPoint[prop] = typeof value === "number" && !isNaN(value) ? value : null;
        });
        return dataPoint;
      })
      .filter((d) => d.timestamp && !isNaN(d.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [telemetryData, allProperties]);

  // Filter by time range
  const now = Date.now();
  const timeRanges: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000, // Last 30 days
  };
  
  // Filter by time range - ensure we get all data within the range
  const filteredData = React.useMemo(() => {
    const rangeStart = now - timeRanges[timeRange];
    return allData.filter((item) => {
      return item.timestamp >= rangeStart && item.timestamp <= now;
    });
  }, [allData, timeRange, timeRanges, now]);

  // Always show 10 evenly spaced data points (each point renders up to 2 bars: temp left/right)
  // Divide the time range into 10 equal intervals and find the closest data point for each
  const chartData = React.useMemo(() => {
    const TARGET_POINTS = 10;

    if (filteredData.length === 0) {
      return [];
    }

    // Sort filtered data by timestamp to ensure proper closest point finding
    const sortedData = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);

    if (sortedData.length === 0) {
      return [];
    }

    const rangeNow = Date.now();
    
    // For all ranges, use current time as end and calculate start from range
    const rangeEnd = rangeNow;
    const rangeStart = rangeNow - timeRanges[timeRange];

    const totalDuration = rangeEnd - rangeStart;
    const intervalDuration = totalDuration / TARGET_POINTS;

    // Create 10 evenly spaced target timestamps (one for each bar)
    // These will be used for X-axis positioning to ensure even spacing
    const targetTimestamps = Array.from({ length: TARGET_POINTS }).map((_, index) => {
      return rangeStart + (index + 0.5) * intervalDuration; // Use midpoint of interval
    });

    // Search window scales with time range so sparse data still gets points (24h/7d need larger window)
    const searchWindow =
      timeRange === "30d"
        ? 3 * 24 * 60 * 60 * 1000
        : timeRange === "7d"
          ? 12 * 60 * 60 * 1000
          : timeRange === "24h"
            ? 3 * 60 * 60 * 1000
            : 60 * 60 * 1000;

    const chartPoints = targetTimestamps.map((targetTime) => {
      const nearbyPoints = sortedData.filter((point) => {
        return Math.abs(point.timestamp - targetTime) <= searchWindow;
      });

      // Create entry with evenly spaced timestamp for X-axis
      const entry: Record<string, any> = {
        timestamp: targetTime, // Use target timestamp for even spacing on X-axis
      };

      // For each property, calculate value from nearby points
      allProperties.forEach((prop) => {
        if (nearbyPoints.length > 0) {
          // Collect all valid values for this property from nearby points
          const validValues = nearbyPoints
            .map((point) => point[prop])
            .filter((value) => value !== null && value !== undefined && !isNaN(value) && typeof value === "number");

          if (validValues.length > 0) {
            // Use average of nearby points for more stable values
            const average = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
            entry[prop] = average;
          } else {
            // No valid values in nearby points, try to find closest point with this property
            let closestValue: number | null = null;
            let closestDistance = Infinity;

            for (const point of sortedData) {
              const value = point[prop];
              if (value !== null && value !== undefined && !isNaN(value) && typeof value === "number") {
                const distance = Math.abs(point.timestamp - targetTime);
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestValue = value;
                }
              }
            }

            entry[prop] = closestValue;
          }
        } else {
          // No nearby points, find closest point with this property from all data
          let closestValue: number | null = null;
          let closestDistance = Infinity;

          for (const point of sortedData) {
            const value = point[prop];
            if (value !== null && value !== undefined && !isNaN(value) && typeof value === "number") {
              const distance = Math.abs(point.timestamp - targetTime);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestValue = value;
              }
            }
          }

          entry[prop] = closestValue;
        }
      });

      // Map alternate property names to standard chart keys so Bars (dataKey="temperature_left" etc.) find values
      entry.temperature_left =
        entry.temperature_left ??
        entry["Temperature Left"] ??
        entry["Data Left"] ??
        null;
      entry.temperature_right =
        entry.temperature_right ??
        entry["Temperature Right"] ??
        entry["Data Right"] ??
        null;
      entry.temperature =
        entry.temperature ??
        entry["Temperature Left"] ??
        entry["Data Left"] ??
        entry.temperature_left ??
        null;

      return entry;
    });

    return chartPoints;
  }, [filteredData, timeRange, timeRanges, allProperties]);

  // Property name variants: devices may send "Temperature Left", "Data Left", "Data Right" instead of temperature_left / temperature_right
  const TEMP_LEFT_KEYS = ["temperature_left", "Temperature Left", "Data Left"];
  const TEMP_RIGHT_KEYS = ["temperature_right", "Temperature Right", "Data Right"];
  const TEMP_SINGLE_KEYS = ["temperature", "Temperature", "Temperature Left", "Data Left"];

  const hasTemperatureLeft = allProperties.some((p) => TEMP_LEFT_KEYS.includes(p));
  const hasTemperatureRight = allProperties.some((p) => TEMP_RIGHT_KEYS.includes(p));
  const hasTemperature = allProperties.some((p) => TEMP_SINGLE_KEYS.includes(p));

  // Use custom sensor names if available, otherwise use defaults
  const leftSensorLabel = sensorNameLeft || "CH1";
  const rightSensorLabel = sensorNameRight || "CH2";

  // Use Temperature Alert thresholds (not calculated averages from data)
  const temperatureStats = React.useMemo(() => {
    return {
      left: {
        min: minTemperatureCH1 ?? null,
        max: maxTemperatureCH1 ?? null,
      },
      right: {
        min: minTemperatureCH2 ?? null,
        max: maxTemperatureCH2 ?? null,
      },
    };
  }, [minTemperatureCH1, maxTemperatureCH1, minTemperatureCH2, maxTemperatureCH2]);

  // Dynamic Y-axis domain from data: small ranges get proportional padding so bars are visible (e.g. -0.1 to -0.032 → axis like -0.2 to 0.1)
  const temperatureDomain = React.useMemo(() => {
    const values: number[] = [];
    chartData.forEach((entry: Record<string, unknown>) => {
      for (const key of ["temperature", "temperature_left", "temperature_right"]) {
        const v = entry[key];
        if (typeof v === "number" && !isNaN(v)) values.push(v);
      }
    });
    const alertMins = [minTemperatureCH1, minTemperatureCH2].filter((n): n is number => n != null);
    const alertMaxs = [maxTemperatureCH1, maxTemperatureCH2].filter((n): n is number => n != null);
    const all = [...values, ...alertMins, ...alertMaxs];
    if (all.length === 0) return [-5, 35] as [number, number];
    const dataMin = Math.min(...all);
    const dataMax = Math.max(...all);
    const range = dataMax - dataMin;
    // Proportional padding: small range (e.g. -0.1 to -0.032) → small padding so bars fill the chart
    const minPadding = 0.02;
    const padding = range === 0 ? 0.5 : Math.max(minPadding, range * 0.2);
    let minDomain = dataMin - padding;
    let maxDomain = dataMax + padding;
    // Enforce minimum axis span so scale is readable (e.g. at least 0.5°C)
    const minSpan = 0.5;
    if (maxDomain - minDomain < minSpan) {
      const center = (minDomain + maxDomain) / 2;
      minDomain = center - minSpan / 2;
      maxDomain = center + minSpan / 2;
    }
    return [minDomain, maxDomain] as [number, number];
  }, [chartData, minTemperatureCH1, maxTemperatureCH1, minTemperatureCH2, maxTemperatureCH2]);

  // Bar chart: plot values relative to domain min so ALL bars start at bottom (0) and go up
  const chartDataForBars = React.useMemo(() => {
    const domainMin = temperatureDomain[0];
    const domainMax = temperatureDomain[1];
    return chartData.map((entry: Record<string, unknown>) => {
      const out = { ...entry, date: entry.date } as Record<string, unknown>;
      for (const key of ["temperature", "temperature_left", "temperature_right"]) {
        const v = entry[key];
        if (v === null || v === undefined || (typeof v === "number" && isNaN(v))) {
          out[key] = 0; // no data → zero height bar at bottom
        } else {
          out[key] = typeof v === "number" ? v - domainMin : 0; // plot from 0 (bottom) upward
        }
      }
      return out;
    });
  }, [chartData, temperatureDomain]);

  // Y-axis range for plotted values: always [0, span] so bars go from bottom up
  const barChartYDomain = React.useMemo(() => {
    const domainMin = temperatureDomain[0];
    const domainMax = temperatureDomain[1];
    return [0, domainMax - domainMin] as [number, number];
  }, [temperatureDomain]);

  // Chart configuration for shadcn with min/max in labels
  const chartConfig = {
    temperature: {
      label: "Temperature",
      color: "hsl(var(--chart-1))",
    },
    temperature_left: {
      label: hasTemperatureLeft && temperatureStats.left.min !== null && temperatureStats.left.max !== null
        ? `${leftSensorLabel} (Min: ${temperatureStats.left.min.toFixed(1)}°C, Max: ${temperatureStats.left.max.toFixed(1)}°C)`
        : leftSensorLabel,
      color: "hsl(var(--chart-1))",
    },
    temperature_right: {
      label: hasTemperatureRight && temperatureStats.right.min !== null && temperatureStats.right.max !== null
        ? `${rightSensorLabel} (Min: ${temperatureStats.right.min.toFixed(1)}°C, Max: ${temperatureStats.right.max.toFixed(1)}°C)`
        : rightSensorLabel,
      color: "#16a34a", // Intense green (green-600)
    },
  } satisfies ChartConfig;

  // Get properties to display in sensor readings - always include battery if available
  const displayProperties = React.useMemo(() => {
    // Priority: temperature_left, temperature_right, temperature (single-sensor), then ONE battery field
    const result: string[] = [];
    
    if (allProperties.includes("temperature_left")) {
      result.push("temperature_left");
    }
    if (allProperties.includes("temperature_right")) {
      result.push("temperature_right");
    }
    // Single-sensor temperature (e.g. TS301)
    if (allProperties.includes("temperature")) {
      result.push("temperature");
    }
    
    const batteryFields = ["battery", "battery_level", "batteryLevel", "electricity"];
    for (const batteryField of batteryFields) {
      if (allProperties.includes(batteryField)) {
        result.push(batteryField);
        break;
      }
    }
    
    return result.slice(0, 4);
  }, [allProperties]);

  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
      <CardHeader className="space-y-3 border-b py-4">
        {/* Device Name Row - truncate long names so all cards look the same */}
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="flex min-w-0 shrink items-center gap-2 text-sm">
            <FaMicrochip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate" title={deviceName || `Device ${deviceId}`}>
              {deviceName || `Device ${deviceId}`}
            </span>
          </CardTitle>
          <Badge
            variant={deviceStatus === "ONLINE" ? "default" : "secondary"}
            className="h-5 shrink-0 text-[8px]"
          >
            <FaCircle
              className={`mr-1 h-2 w-2 ${
                deviceStatus === "ONLINE" ? "animate-pulse text-green-400" : "text-gray-400"
              }`}
            />
            {deviceStatus}
          </Badge>
        </div>
        {/* Controls Row: Export and Time Range Select */}
        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <ExportTelemetryButton
              deviceId={deviceId}
              variant="outline"
              size="sm"
            />
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[140px] text-xs rounded-lg"
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
              <SelectItem value="30d" className="rounded-lg text-xs">
                Last 30 Days
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
            {/* Current Sensor Readings - CH1, CH2, and Battery in single row */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              {displayProperties.map((prop) => {
                const value = latestValues[prop];
                const config = propertyIcons[prop] || {
                  icon: FaChartLine,
                  color: "text-gray-500",
                  unit: "",
                };
                const Icon = config.icon;
                
                // Use custom sensor names for temperature_left and temperature_right
                let displayName = prop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                if (prop === "temperature_left" && sensorNameLeft) {
                  displayName = sensorNameLeft;
                } else if (prop === "temperature_right" && sensorNameRight) {
                  displayName = sensorNameRight;
                } else if (prop === "temperature_left") {
                  displayName = "CH1";
                } else if (prop === "temperature_right") {
                  displayName = "CH2";
                }

                // For battery, show percentage from batteryInfo if available
                let displayValue = value;
                let displayUnit = config.unit || "";
                if (prop.toLowerCase().includes("battery") || prop === "electricity") {
                  // Use batteryInfo for consistent battery display
                  if (batteryInfo.percentage !== null) {
                    displayValue = batteryInfo.percentage;
                    displayUnit = "%";
                  }
                }

                // Get min/max for temperature sensors from Temperature Alert Settings
                let minMaxInfo = null;
                if (prop === "temperature_left") {
                  const min = minTemperatureCH1;
                  const max = maxTemperatureCH1;
                  if (min !== null && min !== undefined && max !== null && max !== undefined) {
                    minMaxInfo = {
                      min: min.toFixed(1),
                      max: max.toFixed(1),
                    };
                  }
                } else if (prop === "temperature_right") {
                  const min = minTemperatureCH2;
                  const max = maxTemperatureCH2;
                  if (min !== null && min !== undefined && max !== null && max !== undefined) {
                    minMaxInfo = {
                      min: min.toFixed(1),
                      max: max.toFixed(1),
                    };
                  }
                }

                return (
                  <div
                    key={prop}
                    className="flex flex-col rounded-lg border border-border/40 bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground">
                          {displayName}
                        </span>
                        {minMaxInfo && (
                          <span className="text-[9px] text-muted-foreground opacity-75 leading-tight">
                            Min: {minMaxInfo.min}°C, Max: {minMaxInfo.max}°C
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-lg font-bold">
                      {displayValue !== null && displayValue !== undefined
                        ? `${typeof displayValue === "number" ? displayValue.toFixed(displayUnit === "%" ? 0 : 1) : displayValue}${displayUnit}`
                        : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Temperature Bar Chart - Multiple */}
            {chartData.length > 0 && (hasTemperatureLeft || hasTemperatureRight || hasTemperature) ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart accessibilityLayer data={chartDataForBars} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    minTickGap={timeRange === "24h" ? 38 : timeRange === "7d" ? 48 : timeRange === "30d" ? 56 : 20}
                    interval={timeRange === "24h" ? 1 : 0}
                    tick={{ fill: "#000000", fontWeight: "bold", fontSize: timeRange === "24h" || timeRange === "7d" ? "11px" : "14px" }}
                    tickFormatter={(value) => {
                      try {
                        const timestamp = Number(value);
                        if (!timestamp || isNaN(timestamp)) return "";
                        const date = new Date(timestamp);
                        if (isNaN(date.getTime())) return "";

                        const rangeNow = Date.now();
                        const rangeStart = rangeNow - timeRanges[timeRange];
                        const intervalDuration = rangeNow - rangeStart;
                        const intervalDurationPerBar = intervalDuration / 10;

                        // Short formats to prevent label overflow: 24h = HH:mm, 7d = dd HH:mm, 30d = dd/MM
                        if (timeRange === "24h") {
                          return format(date, "HH:mm");
                        }
                        if (timeRange === "7d") {
                          return format(date, "dd HH:mm");
                        }
                        if (timeRange === "30d") {
                          return format(date, "dd/MM");
                        }
                        if (intervalDurationPerBar < 60 * 60 * 1000) {
                          return format(date, "HH:mm");
                        }
                        return format(date, "HH:mm");
                      } catch (error) {
                        return "";
                      }
                    }}
                  />
                  <YAxis
                    domain={barChartYDomain}
                    allowDataOverflow={true}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    label={{
                      value: "Temperature (°C)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: "0.875rem", fontWeight: "bold" },
                    }}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const plotted = payload?.value;
                      const domainMin = temperatureDomain[0];
                      const actualTemp = typeof plotted === "number" && !isNaN(plotted) ? plotted + domainMin : null;
                      const tolerance = 0.2;
                      const isThreshold = actualTemp !== null && (
                        (hasTemperatureLeft && temperatureStats.left.min !== null && Math.abs(actualTemp - temperatureStats.left.min) < tolerance) ||
                        (hasTemperatureLeft && temperatureStats.left.max !== null && Math.abs(actualTemp - temperatureStats.left.max) < tolerance) ||
                        (hasTemperatureRight && temperatureStats.right.min !== null && Math.abs(actualTemp - temperatureStats.right.min) < tolerance) ||
                        (hasTemperatureRight && temperatureStats.right.max !== null && Math.abs(actualTemp - temperatureStats.right.max) < tolerance)
                      );
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={4}
                            textAnchor="end"
                            fill={isThreshold ? "#E60000" : "#000000"}
                            fontSize={isThreshold ? "15px" : "14px"}
                            fontWeight="bold"
                          >
                            {actualTemp !== null ? actualTemp.toFixed(1) : ""}
                          </text>
                        </g>
                      );
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
                        formatter={(value, name) => {
                          const actual = typeof value === "number" && !isNaN(value) ? value + temperatureDomain[0] : null;
                          return (
                            <div className="flex flex-1 justify-between gap-2 leading-none items-center">
                              <span className="text-muted-foreground">{name}</span>
                              <span className="font-mono font-medium tabular-nums text-foreground">
                                {actual !== null ? `${actual.toFixed(1)}°C` : "—"}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  {/* Temperature Alert Reference Lines for CH1 (temperature_left) - Orange color */}
                  {/* Show CH1 reference lines if we have alert settings, even if no data yet */}
                  {temperatureStats.left.min !== null && (
                    <ReferenceLine
                      y={temperatureStats.left.min - temperatureDomain[0]}
                      stroke="#fb923c"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${leftSensorLabel} Min: ${temperatureStats.left.min.toFixed(1)}°C`,
                        position: "right",
                        fill: "#fb923c",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                  {temperatureStats.left.max !== null && (
                    <ReferenceLine
                      y={temperatureStats.left.max - temperatureDomain[0]}
                      stroke="#fb923c"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${leftSensorLabel} Max: ${temperatureStats.left.max.toFixed(1)}°C`,
                        position: "right",
                        fill: "#fb923c",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                  {/* Temperature Alert Reference Lines for CH2 (temperature_right) - Green color */}
                  {/* Show CH2 reference lines if we have alert settings, even if no data yet */}
                  {temperatureStats.right.min !== null && (
                    <ReferenceLine
                      y={temperatureStats.right.min - temperatureDomain[0]}
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${rightSensorLabel} Min: ${temperatureStats.right.min.toFixed(1)}°C`,
                        position: "right",
                        fill: "#16a34a",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                  {temperatureStats.right.max !== null && (
                    <ReferenceLine
                      y={temperatureStats.right.max - temperatureDomain[0]}
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `${rightSensorLabel} Max: ${temperatureStats.right.max.toFixed(1)}°C`,
                        position: "right",
                        fill: "#16a34a",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                  {hasTemperature && (
                    <Bar dataKey="temperature" fill="var(--color-temperature)" radius={4} maxBarSize={30}>
                      {chartDataForBars.map((entry: any, index: number) => {
                        const value = entry.temperature;
                        const fillColor = "var(--color-temperature)";
                        return <Cell key={`cell-temp-${index}`} fill={fillColor} />;
                      })}
                    </Bar>
                  )}
                  {hasTemperatureLeft && (
                    <Bar dataKey="temperature_left" fill="var(--color-temperature_left)" radius={4} maxBarSize={30}>
                      {chartDataForBars.map((_: any, index: number) => {
                        const value = chartData[index]?.temperature_left;
                        let fillColor = "var(--color-temperature_left)";
                        if (value !== null && value !== undefined) {
                          if (minTemperatureCH1 != null && value < minTemperatureCH1) fillColor = "#E60000";
                          else if (maxTemperatureCH1 != null && value > maxTemperatureCH1) fillColor = "#E60000";
                        }
                        return <Cell key={`cell-left-${index}`} fill={fillColor} />;
                      })}
                    </Bar>
                  )}
                  {hasTemperatureRight && (
                    <Bar dataKey="temperature_right" fill="var(--color-temperature_right)" radius={4} maxBarSize={30}>
                      {chartDataForBars.map((_: any, index: number) => {
                        const value = chartData[index]?.temperature_right;
                        let fillColor = "var(--color-temperature_right)";
                        if (value !== null && value !== undefined) {
                          if (minTemperatureCH2 != null && value < minTemperatureCH2) fillColor = "#E60000";
                          else if (maxTemperatureCH2 != null && value > maxTemperatureCH2) fillColor = "#E60000";
                        }
                        return <Cell key={`cell-right-${index}`} fill={fillColor} />;
                      })}
                    </Bar>
                  )}
                  <ChartLegend 
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      return (
                        <div className="flex items-center justify-center gap-4 pt-3">
                          {payload.map((item) => {
                            const key = item.dataKey as string;
                            const itemConfig = chartConfig[key as keyof typeof chartConfig];
                            const label = itemConfig?.label || item.value;
                            
                            // Parse label to separate sensor name from min/max
                            const labelMatch = label?.match(/^(.+?)\s*\(Min:\s*([\d.]+)°C,\s*Max:\s*([\d.]+)°C\)$/);
                            const sensorName = labelMatch ? labelMatch[1] : label;
                            const minMax = labelMatch ? { min: labelMatch[2], max: labelMatch[3] } : null;
                            
                            return (
                              <div
                                key={item.value}
                                className="flex items-center gap-1.5"
                              >
                                <div
                                  className="h-2 w-2 shrink-0 rounded-[2px]"
                                  style={{
                                    backgroundColor: item.color,
                                  }}
                                />
                                <span className="text-muted-foreground text-xs">
                                  {sensorName}
                                  {minMax && (
                                    <span className="text-[10px] opacity-75">
                                      {" "}(Min: {minMax.min}°C, Max: {minMax.max}°C)
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
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
              <details className="group mt-4 rounded-lg border border-border/40 bg-muted/20 p-4">
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
                    
                    // Use custom sensor names for temperature_left and temperature_right
                    let displayName = prop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                    if (prop === "temperature_left" && sensorNameLeft) {
                      displayName = sensorNameLeft;
                    } else if (prop === "temperature_right" && sensorNameRight) {
                      displayName = sensorNameRight;
                    }
                    
                    return (
                      <div key={prop} className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span className="text-xs text-muted-foreground">
                            {displayName}
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

