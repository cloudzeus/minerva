/**
 * Device Detail Page - Comprehensive stats and telemetry
 * Accessible by: ALL ROLES
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  FaMicrochip,
  FaCircle,
  FaArrowLeft,
  FaThermometerHalf,
  FaBatteryHalf,
  FaChartLine,
  FaServer,
} from "react-icons/fa";
import { TemperatureLineChart } from "@/components/charts/temperature-line-chart";
import { BatteryLineChart } from "@/components/charts/battery-line-chart";
import { MultiMeasurementChart } from "@/components/charts/multi-measurement-chart";
import { DeviceTelemetryTable } from "@/components/device-telemetry-table";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";
import { TemperatureAlertSettings } from "@/components/temperature-alert-settings";
import { getTemperatureAlert } from "@/app/actions/temperature-alerts";

async function getDeviceWithTelemetry(deviceId: string) {
  return await prisma.milesightDeviceCache.findUnique({
    where: { deviceId },
    include: {
      telemetryData: {
        take: 200,
        orderBy: { dataTimestamp: "desc" },
      },
    },
  });
}

async function getDeviceStats(deviceId: string) {
  const telemetryData = await prisma.milesightDeviceTelemetry.findMany({
    where: { deviceId },
    orderBy: { dataTimestamp: "desc" },
    take: 1000,
  });

  // Calculate statistics
  const latestByProperty = new Map();
  const allProperties = new Set<string>();

  telemetryData.forEach((t) => {
    if (t.sensorData) {
      const data = JSON.parse(t.sensorData);
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === "number") {
          allProperties.add(key);
          if (!latestByProperty.has(key)) {
            latestByProperty.set(key, []);
          }
          latestByProperty.get(key).push(value);
        }
      });
    }
  });

  // Calculate min, max, avg for each property
  const stats = new Map();
  allProperties.forEach((prop) => {
    const values = latestByProperty.get(prop) || [];
    if (values.length > 0) {
      stats.set(prop, {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        count: values.length,
      });
    }
  });

  return {
    totalRecords: telemetryData.length,
    stats: Object.fromEntries(stats),
    properties: Array.from(allProperties),
  };
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  
  const [device, deviceStats, temperatureAlert] = await Promise.all([
    getDeviceWithTelemetry(deviceId),
    getDeviceStats(deviceId),
    getTemperatureAlert(deviceId).catch(() => null), // Ignore errors if user doesn't have permission
  ]);

  if (!device) {
    notFound();
  }

  const isGateway =
    device.deviceType === "GATEWAY" ||
    device.deviceType?.toUpperCase().includes("UG");
  
  // Check if this is a thermometer device (TS302, etc.)
  const isThermometer =
    device.deviceType?.toUpperCase().includes("TS") ||
    device.name?.toUpperCase().includes("TS302") ||
    deviceStats.properties.some((p) => p.toLowerCase().includes("temperature"));

  return (
    <DashboardLayout requiredRole={[Role.EMPLOYEE, Role.MANAGER, Role.ADMIN]}>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/devices/list">
                <FaArrowLeft className="mr-2 h-3 w-3" />
                Back to List
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <FaMicrochip className="h-5 w-5 text-purple-600" />
                <h1 className="text-xl font-bold tracking-tight">
                  {device.name || `Device ${deviceId}`}
                </h1>
                <Badge
                  variant={device.lastStatus === "ONLINE" ? "default" : "secondary"}
                >
                  <FaCircle
                    className={`mr-1 h-2 w-2 ${
                      device.lastStatus === "ONLINE"
                        ? "animate-pulse text-green-500"
                        : "text-gray-500"
                    }`}
                  />
                  {device.lastStatus || "UNKNOWN"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {device.deviceType || "Device"} · SN: {device.sn || "—"}
              </p>
            </div>
          </div>
          <ExportTelemetryButton deviceId={deviceId} />
        </div>

        {/* Stats Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Records
              </CardTitle>
              <FaChartLine className="h-3.5 w-3.5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{deviceStats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">Telemetry entries</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Properties
              </CardTitle>
              <FaChartLine className="h-3.5 w-3.5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{deviceStats.properties.length}</div>
              <p className="text-xs text-muted-foreground">Sensor types</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Device ID
              </CardTitle>
              <FaMicrochip className="h-3.5 w-3.5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono">{device.deviceId}</div>
              <p className="text-xs text-muted-foreground">Milesight ID</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Last Sync
              </CardTitle>
              <FaCircle className="h-3.5 w-3.5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xs">{formatDateTime(device.lastSyncAt)}</div>
              <p className="text-xs text-muted-foreground">From Milesight API</p>
            </CardContent>
          </Card>
        </div>

        {/* Property Statistics */}
        {deviceStats.properties.length > 0 && (
          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm">Sensor Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {deviceStats.properties.map((prop) => {
                  const stat = deviceStats.stats[prop];
                  if (!stat) return null;

                  return (
                    <div
                      key={prop}
                      className="rounded-lg border border-border/40 bg-muted/30 p-3"
                    >
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        {prop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Min</div>
                          <div className="font-mono font-semibold">
                            {stat.min.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg</div>
                          <div className="font-mono font-semibold">
                            {stat.avg.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Max</div>
                          <div className="font-mono font-semibold">
                            {stat.max.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Temperature Alert Settings - Only for Thermometer Devices */}
        {isThermometer && !isGateway && (
          <TemperatureAlertSettings
            deviceId={deviceId}
            deviceName={device.name || `Device ${deviceId}`}
            initialSettings={temperatureAlert}
          />
        )}

        {/* Charts - Temperature Sensors Only */}
        {!isGateway && device.telemetryData.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <TemperatureLineChart
                data={device.telemetryData}
                title="Temperature Trends"
              />
              <BatteryLineChart data={device.telemetryData} title="Battery Level" />
            </div>

            <div className="grid gap-4">
              <MultiMeasurementChart
                data={device.telemetryData}
                title="All Measurements"
              />
            </div>
          </>
        )}

        {/* Gateway Info */}
        {isGateway && (
          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FaServer className="h-4 w-4 text-blue-600" />
                Gateway Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device Type:</span>
                  <span className="font-semibold">LoRaWAN Gateway</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-mono font-semibold">
                    {device.deviceType || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DevEUI:</span>
                  <span className="font-mono">{device.devEUI || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Events Received:</span>
                  <span className="font-semibold">{device.telemetryData.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Telemetry Data Table */}
        <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm">
              Recent Telemetry ({device.telemetryData.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DeviceTelemetryTable telemetryData={device.telemetryData} />
          </CardContent>
        </Card>

        {/* Device Technical Details */}
        <Card className="border-border/40 bg-card/50 bg-muted/30 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm">Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milesight Device ID:</span>
                <span className="font-mono">{device.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serial Number:</span>
                <span className="font-mono">{device.sn || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DevEUI:</span>
                <span className="font-mono">{device.devEUI || "—"}</span>
              </div>
              {device.imei && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IMEI:</span>
                  <span className="font-mono">{device.imei}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDateTime(device.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDateTime(device.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Synced:</span>
                <span>{formatDateTime(device.lastSyncAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

