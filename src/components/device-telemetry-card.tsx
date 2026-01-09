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
      
      // Also check database battery field if sensorData doesn't have it
      if (d.battery !== null && d.battery !== undefined) {
        // Add battery if not already in props (check all variations)
        const hasBattery = Array.from(props).some(p => 
          p.toLowerCase().includes("battery") || p === "electricity"
        );
        if (!hasBattery) {
          props.add("battery");
        }
      }
      
      // Also check database battery field if sensorData doesn't have it
      if (d.battery !== null && d.battery !== undefined) {
        // Add battery if not already in props (check all variations)
        const hasBattery = Array.from(props).some(p => 
          p.toLowerCase().includes("battery") || p === "electricity"
        );
        if (!hasBattery) {
          props.add("battery");
        }
      }
    });
    
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
    
    // Search through telemetry data (already sorted by dataTimestamp desc) to find latest non-null values
    for (const reading of telemetryData) {
      if (reading.sensorData) {
        try {
          const sensorData = JSON.parse(reading.sensorData);
          
          // For each property in sensorData, use the first (latest) non-null value we find
          Object.keys(sensorData).forEach((key) => {
            const val = sensorData[key];
            // Only set if we haven't found a value for this property yet and it's a valid number
            // Note: 0 is a valid value (could be temperature), so check for null/undefined specifically
            if (!(key in values) && val !== null && val !== undefined && typeof val === "number" && !isNaN(val)) {
              values[key] = val;
            }
          });
        } catch (e) {
          console.error(`[${deviceName}] Failed to parse sensorData:`, e);
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
    if (!latestReading?.sensorData) {
      // Fallback to database field if sensorData is not available
      if (latestReading?.battery !== null && latestReading?.battery !== undefined) {
        return { percentage: latestReading.battery, capacity: null };
      }
      return { percentage: null, capacity: null };
    }
    const sensorData = JSON.parse(latestReading.sensorData);
    
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

  // Prepare chart data with ALL numeric properties
  // Sort by timestamp to ensure chronological order
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
          if (typeof value === "number" && !isNaN(value)) {
            dataPoint[prop] = value;
          } else {
            dataPoint[prop] = null;
          }
        });
        
        return dataPoint;
      })
      .filter((d) => d.timestamp && !isNaN(d.timestamp)) // Filter out invalid timestamps
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

    // For each target timestamp, find the closest data point or use average from nearby points
    // Since devices send data every 20 minutes, we should always find a value
    const chartPoints = targetTimestamps.map((targetTime, index) => {
      // Find nearby points within a reasonable window (e.g., 1 hour)
      const searchWindow = 60 * 60 * 1000; // 1 hour window
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

      return entry;
    });

    return chartPoints;
  }, [filteredData, timeRange, timeRanges, allProperties]);

  // Only show temperature_left and temperature_right in chart
  const hasTemperatureLeft = allProperties.includes("temperature_left");
  const hasTemperatureRight = allProperties.includes("temperature_right");

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

  // Chart configuration for shadcn with min/max in labels
  const chartConfig = {
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
    // Priority: temperature_left, temperature_right, then ONE battery field
    const result: string[] = [];
    
    // Add temperature_left if available
    if (allProperties.includes("temperature_left")) {
      result.push("temperature_left");
    }
    
    // Add temperature_right if available
    if (allProperties.includes("temperature_right")) {
      result.push("temperature_right");
    }
    
    // Add ONE battery field (prefer "battery" over "battery_level" or "electricity")
    const batteryFields = ["battery", "battery_level", "batteryLevel", "electricity"];
    for (const batteryField of batteryFields) {
      if (allProperties.includes(batteryField)) {
        result.push(batteryField);
        break; // Only add one battery field
      }
    }
    
    // Limit to top 3 to show: temp_left, temp_right, and battery
    return result.slice(0, 3);
  }, [allProperties]);

  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#e0e1e2' }}>
      <CardHeader className="space-y-3 border-b py-4">
        {/* Device Name Row */}
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FaMicrochip className="h-3.5 w-3.5 text-muted-foreground" />
            {deviceName || `Device ${deviceId}`}
          </CardTitle>
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
                    interval={0}
                    tick={{ fill: "#000000", fontWeight: "bold", fontSize: "14px" }}
                    tickFormatter={(value) => {
                      try {
                        const timestamp = Number(value);
                        if (!timestamp || isNaN(timestamp)) return "";
                        const date = new Date(timestamp);
                        if (isNaN(date.getTime())) return "";

                        // Calculate interval duration based on time range
                        const rangeNow = Date.now();
                        const rangeEnd = rangeNow;
                        const rangeStart = rangeNow - timeRanges[timeRange];
                        const intervalDuration = rangeEnd - rangeStart;
                        const intervalDurationPerBar = intervalDuration / 10;

                        // Format based on interval duration per bar
                        // For intervals < 1 hour (6 minutes per bar): show HH:mm
                        // For intervals < 24 hours (144 minutes per bar): show MMM d HH:mm
                        // For intervals >= 24 hours (16.8 hours per bar): show MMM d
                        if (intervalDurationPerBar < 60 * 60 * 1000) {
                          return format(date, "HH:mm");
                        }
                        if (intervalDurationPerBar < 24 * 60 * 60 * 1000) {
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
                      style: { fontSize: "0.875rem", fontWeight: "bold" },
                    }}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const value = payload.value;
                      
                      // Check if this tick value matches any threshold min/max (with tolerance)
                      const tolerance = 0.2;
                      const isThreshold = 
                        (hasTemperatureLeft && temperatureStats.left.min !== null && Math.abs(value - temperatureStats.left.min) < tolerance) ||
                        (hasTemperatureLeft && temperatureStats.left.max !== null && Math.abs(value - temperatureStats.left.max) < tolerance) ||
                        (hasTemperatureRight && temperatureStats.right.min !== null && Math.abs(value - temperatureStats.right.min) < tolerance) ||
                        (hasTemperatureRight && temperatureStats.right.max !== null && Math.abs(value - temperatureStats.right.max) < tolerance);
                      
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
                            {value.toFixed(1)}
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
                      />
                    }
                  />
                  {/* Temperature Alert Reference Lines for CH1 (temperature_left) - Orange color */}
                  {/* Show CH1 reference lines if we have alert settings, even if no data yet */}
                  {temperatureStats.left.min !== null && (
                    <ReferenceLine
                      y={temperatureStats.left.min}
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
                      ifOverflow="extendDomain"
                    />
                  )}
                  {temperatureStats.left.max !== null && (
                    <ReferenceLine
                      y={temperatureStats.left.max}
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
                      ifOverflow="extendDomain"
                    />
                  )}
                  {/* Temperature Alert Reference Lines for CH2 (temperature_right) - Green color */}
                  {/* Show CH2 reference lines if we have alert settings, even if no data yet */}
                  {temperatureStats.right.min !== null && (
                    <ReferenceLine
                      y={temperatureStats.right.min}
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
                      ifOverflow="extendDomain"
                    />
                  )}
                  {temperatureStats.right.max !== null && (
                    <ReferenceLine
                      y={temperatureStats.right.max}
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
                      ifOverflow="extendDomain"
                    />
                  )}
                  {hasTemperatureLeft && (
                    <Bar dataKey="temperature_left" fill="var(--color-temperature_left)" radius={4} maxBarSize={30}>
                      {chartData.map((entry: any, index: number) => {
                        const value = entry.temperature_left;
                        let fillColor = "var(--color-temperature_left)";
                        
                        if (value !== null && value !== undefined) {
                          // Check if value exceeds threshold range
                          if (minTemperatureCH1 !== null && minTemperatureCH1 !== undefined && value < minTemperatureCH1) {
                            fillColor = "#E60000"; // Vodafone red for below min
                          } else if (maxTemperatureCH1 !== null && maxTemperatureCH1 !== undefined && value > maxTemperatureCH1) {
                            fillColor = "#E60000"; // Vodafone red for above max
                          }
                        }
                        
                        return <Cell key={`cell-left-${index}`} fill={fillColor} />;
                      })}
                    </Bar>
                  )}
                  {hasTemperatureRight && (
                    <Bar dataKey="temperature_right" fill="var(--color-temperature_right)" radius={4} maxBarSize={30}>
                      {chartData.map((entry: any, index: number) => {
                        const value = entry.temperature_right;
                        let fillColor = "var(--color-temperature_right)"; // Intense green by default
                        
                        if (value !== null && value !== undefined) {
                          // Check if value exceeds threshold range
                          if (minTemperatureCH2 !== null && minTemperatureCH2 !== undefined && value < minTemperatureCH2) {
                            fillColor = "#E60000"; // Vodafone red for below min
                          } else if (maxTemperatureCH2 !== null && maxTemperatureCH2 !== undefined && value > maxTemperatureCH2) {
                            fillColor = "#E60000"; // Vodafone red for above max
                          }
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

