/**
 * Milesight Device Detail Page
 * 
 * SECURITY: ADMIN-ONLY
 */

import {
  Role,
  MilesightDeviceCache,
  MilesightDeviceTelemetry,
  MilesightWebhookEvent,
} from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FaMicrochip,
  FaCircle,
  FaArrowLeft,
  FaChartLine,
  FaBatteryHalf,
  FaThermometerHalf,
  FaListUl,
} from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDeviceDetails, getDeviceConfiguration } from "@/app/actions/milesight-devices";
import { DeviceTelemetryTable } from "@/components/device-telemetry-table";
import { StatsCard } from "@/components/stats-card";
import { mapMilesightDeviceToCache } from "@/lib/milesight-devices";
import { DeviceFirmwareUpdater } from "@/components/device-firmware-updater";
import { DeviceConfigEditor } from "@/components/device-config-editor";
import { DeviceSensorNamesEditor } from "@/components/device-sensor-names-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DeviceWithTelemetry = MilesightDeviceCache & {
  telemetryData: MilesightDeviceTelemetry[];
};

async function getDeviceFromCache(
  deviceId: string
): Promise<DeviceWithTelemetry | null> {
  return (await prisma.milesightDeviceCache.findUnique({
    where: { deviceId },
    include: {
      telemetryData: {
        take: 50,
        orderBy: { dataTimestamp: "desc" },
      },
    },
  })) as DeviceWithTelemetry | null;
}

async function getRecentDeviceEvents(
  deviceId: string
): Promise<MilesightWebhookEvent[]> {
  return prisma.milesightWebhookEvent.findMany({
    where: { deviceId },
    take: 6,
    orderBy: { createdAt: "desc" },
  });
}

function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (_error) {
    return null;
  }
}

function buildLiveDeviceSnapshot(liveDevice: any): DeviceWithTelemetry {
  const mapped = mapMilesightDeviceToCache(liveDevice);
  const now = new Date();

  return {
    id: `live-${mapped.deviceId}`,
    deviceId: mapped.deviceId,
    sn: mapped.sn,
    devEUI: mapped.devEUI,
    imei: mapped.imei,
    name: mapped.name,
    description: mapped.description,
    tag: mapped.tag,
    sensorNameLeft: null,
    sensorNameRight: null,
    sensorNames: null,
    lastStatus: mapped.lastStatus,
    deviceType: mapped.deviceType,
    lastSyncAt: mapped.lastSyncAt,
    lastHeartbeatAt: liveDevice?.lastHeartbeatAt
      ? new Date(liveDevice.lastHeartbeatAt)
      : liveDevice?.lastReportTime
      ? new Date(liveDevice.lastReportTime)
      : null,
    lastWebhookAt: null,
    lastConsoleSyncAt: now,
    createdAt: now,
    updatedAt: now,
    isCritical: Boolean(liveDevice?.isCritical ?? false),
    criticalAlertActive: Boolean(liveDevice?.criticalAlertActive ?? false),
    lastCriticalAlertAt: liveDevice?.lastCriticalAlertAt
      ? new Date(liveDevice.lastCriticalAlertAt)
      : null,
    telemetryData: [],
  };
}

function summarizeEventPayload(payload: string) {
  const parsed = safeJsonParse<Record<string, unknown>>(payload);

  if (parsed && typeof parsed === "object") {
    const nestedData =
      typeof parsed.data === "object" && parsed.data
        ? (parsed.data as Record<string, unknown>)
        : null;

    const entries =
      nestedData && Object.keys(nestedData).length > 0
        ? Object.entries(nestedData)
        : Object.entries(parsed);

    const flatEntries = entries
      .filter(([key]) => key !== "payload" && key !== "data")
      .filter(([, value]) => typeof value !== "object")
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${value}`);

    if (flatEntries.length > 0) {
      return flatEntries.join(" • ");
    }
  }

  return payload.length > 120 ? `${payload.slice(0, 117)}...` : payload;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;

  const [freshDataResult, cachedDevice, recentEvents, configResult] = await Promise.all([
    getDeviceDetails(deviceId),
    getDeviceFromCache(deviceId),
    getRecentDeviceEvents(deviceId),
    getDeviceConfiguration(deviceId),
  ]);

  const liveDeviceData = freshDataResult.data ?? null;

  const device: DeviceWithTelemetry | null =
    cachedDevice ?? (liveDeviceData ? buildLiveDeviceSnapshot(liveDeviceData) : null);

  if (!device) {
    notFound();
  }

  const telemetryData = device.telemetryData ?? [];
  const deviceConfig =
    configResult.success && configResult.data
      ? configResult.data.properties || configResult.data
      : null;
  const sanitizedConfig = deviceConfig
    ? JSON.parse(JSON.stringify(deviceConfig))
    : null;
  const configTimestamp =
    (configResult.success && configResult.data && (configResult.data as any)?.timestamp) ||
    liveDeviceData?.timestamp ||
    null;
  const latestTelemetry = telemetryData[0] ?? null;
  const latestTelemetryDate = latestTelemetry
    ? new Date(Number(latestTelemetry.dataTimestamp))
    : null;
  const latestSensorPayload =
    safeJsonParse<Record<string, unknown>>(latestTelemetry?.sensorData) ||
    safeJsonParse<Record<string, unknown>>(latestTelemetry?.payload);

  const temperatureLeft =
    asNumber(latestSensorPayload?.temperature_left) ??
    asNumber(latestSensorPayload?.temperatureRight) ??
    asNumber(latestSensorPayload?.temperature) ??
    (latestTelemetry?.temperature ?? null);
  const humidityValue =
    asNumber(latestSensorPayload?.humidity) ??
    asNumber(latestSensorPayload?.hum) ??
    (latestTelemetry?.humidity ?? null);
  const batteryValue =
    asNumber(latestSensorPayload?.battery) ??
    asNumber(latestSensorPayload?.battery_level) ??
    (latestTelemetry?.battery ?? null);

  // Normalize status to uppercase for consistent display
  const rawStatus = device.lastStatus || liveDeviceData?.connectStatus || null;
  let statusLabel = "UNKNOWN";
  if (rawStatus) {
    const normalized = String(rawStatus).toUpperCase().trim();
    if (normalized === "ONLINE" || normalized === "1" || normalized === "TRUE" || normalized === "CONNECTED") {
      statusLabel = "ONLINE";
    } else if (normalized === "OFFLINE" || normalized === "0" || normalized === "FALSE" || normalized === "DISCONNECTED") {
      statusLabel = "OFFLINE";
    } else {
      statusLabel = normalized;
    }
  }
  const statusColor =
    statusLabel === "ONLINE"
      ? "text-green-500"
      : statusLabel === "OFFLINE"
      ? "text-red-500"
      : "text-muted-foreground";
  const batteryColor =
    batteryValue === null
      ? "text-muted-foreground"
      : batteryValue >= 60
      ? "text-green-600"
      : batteryValue >= 30
      ? "text-yellow-500"
      : "text-red-500";

  const telemetrySummaryParts: string[] = [];
  if (temperatureLeft !== null) {
    telemetrySummaryParts.push(`${temperatureLeft.toFixed(1)}°C`);
  }
  if (humidityValue !== null) {
    telemetrySummaryParts.push(`${humidityValue.toFixed(1)}% RH`);
  }
  if (batteryValue !== null) {
    telemetrySummaryParts.push(`${batteryValue}% batt`);
  }

  const stats = [
    {
      title: "Status",
      value: statusLabel,
      description: device.lastStatus
        ? `Updated ${formatDateTime(device.updatedAt)}`
        : "Awaiting first status",
      icon: FaCircle,
      iconColor: statusColor,
    },
    {
      title: "Last Sync",
      value: device.lastSyncAt ? formatDateTime(device.lastSyncAt) : "—",
      description: cachedDevice
        ? "Local cache snapshot"
        : "Live Milesight snapshot",
      icon: FaMicrochip,
      iconColor: "text-slate-500",
    },
    {
      title: "Last Telemetry",
      value: latestTelemetryDate ? formatDateTime(latestTelemetryDate) : "No data",
      description:
        telemetrySummaryParts.length > 0
          ? telemetrySummaryParts.join(" • ")
          : "Waiting for telemetry",
      icon: FaChartLine,
      iconColor: "text-purple-600",
    },
    {
      title: "Battery",
      value: batteryValue !== null ? `${batteryValue}%` : "—",
      description: latestTelemetryDate
        ? `Reading at ${formatDateTime(latestTelemetryDate)}`
        : "No telemetry battery data",
      icon: FaBatteryHalf,
      iconColor: batteryColor,
    },
  ];

  const milesightSnapshotFields = [
    {
      label: "Milesight Status",
      value: liveDeviceData?.connectStatus || "—",
    },
    {
      label: "Model",
      value: liveDeviceData?.model || device.deviceType || "—",
    },
    {
      label: "Firmware",
      value: liveDeviceData?.firmwareVersion || liveDeviceData?.firmware || "—",
    },
    {
      label: "Application",
      value: liveDeviceData?.applicationName || liveDeviceData?.applicationId || "—",
    },
    {
      label: "Last Report",
      value: liveDeviceData?.lastReportTime
        ? formatDateTime(liveDeviceData.lastReportTime)
        : "—",
    },
    {
      label: "Created (Milesight)",
      value: liveDeviceData?.createTime
        ? formatDateTime(liveDeviceData.createTime)
        : "—",
    },
  ].filter((item) => item.value && item.value !== "—");

  const currentFirmwareVersion =
    liveDeviceData?.firmwareVersion ||
    liveDeviceData?.firmware ||
    ((liveDeviceData as any)?.currentFirmwareVersion ?? null);

  const availableFirmwareVersion =
    liveDeviceData?.latestFirmwareVersion ||
    liveDeviceData?.availableFirmwareVersion ||
    liveDeviceData?.targetFirmwareVersion ||
    (Array.isArray((liveDeviceData as any)?.firmwareList)
      ? (liveDeviceData as any)?.firmwareList?.[0]?.version
      : null);

  const isFirmwareOutdated =
    availableFirmwareVersion &&
    currentFirmwareVersion &&
    availableFirmwareVersion !== currentFirmwareVersion;

  const overviewFields = [
    { label: "Device Name", value: device.name || "—" },
    { label: "Serial Number", value: device.sn || "—", mono: true },
    { label: "Device Type", value: device.deviceType || "—" },
    { label: "DevEUI", value: device.devEUI || "—", mono: true },
    { label: "IMEI", value: device.imei || "—", mono: true },
    {
      label: "Last Synced",
      value: device.lastSyncAt ? formatDateTime(device.lastSyncAt) : "—",
    },
    {
      label: "Critical Device",
      value: device.isCritical ? "Enabled" : "Disabled",
    },
    {
      label: "Last Heartbeat",
      value: device.lastHeartbeatAt ? formatDateTime(device.lastHeartbeatAt) : "—",
    },
  ];

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/devices/milesight">
              <FaArrowLeft className="mr-2 h-3 w-3" />
              BACK
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">DEVICE DETAILS</h1>
            <p className="text-sm text-muted-foreground">
              {device.name || device.sn || device.deviceId}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              iconColor={stat.iconColor}
            />
          ))}
        </div>

        {/* Overview & Milesight Snapshot */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                <FaMicrochip className="h-4 w-4 text-indigo-500" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {overviewFields.map((field) => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    <p
                      className={`text-sm ${
                        field.mono ? "font-mono tracking-tight" : ""
                      }`}
                    >
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
              {device.tag && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tag</p>
                  <Badge variant="outline" className="text-[8px]">
                    {device.tag}
                  </Badge>
                </div>
              )}
              {device.description && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm text-muted-foreground">{device.description}</p>
                </div>
              )}
              {(device.deviceType?.toUpperCase().includes("TS302") || device.deviceType?.toUpperCase().includes("TS-302")) && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Sensor Names
                    </p>
                    <DeviceSensorNamesEditor
                      deviceId={device.deviceId}
                      deviceType={device.deviceType}
                      currentSensorNameLeft={device.sensorNameLeft}
                      currentSensorNameRight={device.sensorNameRight}
                    />
                  </div>
                  {device.sensorNameLeft || device.sensorNameRight ? (
                    <div className="space-y-1 text-xs">
                      {device.sensorNameLeft && (
                        <p className="text-muted-foreground">
                          CH1: <span className="font-medium">{device.sensorNameLeft}</span>
                        </p>
                      )}
                      {device.sensorNameRight && (
                        <p className="text-muted-foreground">
                          CH2: <span className="font-medium">{device.sensorNameRight}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Using default names: "CH1" and "CH2"
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                <FaThermometerHalf className="h-4 w-4 text-orange-500" />
                Milesight Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milesightSnapshotFields.length > 0 ? (
                <div className="space-y-3">
                  {milesightSnapshotFields.map((field) => (
                    <div key={field.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-medium">{field.value}</span>
                    </div>
                  ))}
                  <div className="mt-4 rounded-md border border-border/40 bg-background/70 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Current Firmware</p>
                        <p className="text-base font-semibold tracking-tight">
                          {currentFirmwareVersion || "Unavailable"}
                        </p>
                        <div className="flex items-center gap-2">
                          {availableFirmwareVersion ? (
                            <Badge
                              variant={isFirmwareOutdated ? "destructive" : "secondary"}
                              className="text-[8px]"
                            >
                              {isFirmwareOutdated ? "Update Available" : "Up to Date"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px]">
                              No Reference Version
                            </Badge>
                          )}
                          {isFirmwareOutdated && (
                            <span className="text-[11px] text-muted-foreground">
                              Latest: {availableFirmwareVersion}
                            </span>
                          )}
                        </div>
                      </div>
                      <DeviceFirmwareUpdater
                        deviceId={device.deviceId}
                        currentVersion={currentFirmwareVersion || undefined}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Triggering an update will create an OTA job through the Milesight API.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Live Milesight data unavailable. Showing cached details only.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold uppercase tracking-wide">
              <span>Device Configuration</span>
              <DeviceConfigEditor deviceId={device.deviceId} currentConfig={sanitizedConfig} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sanitizedConfig ? (
              <>
                <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                  <span>Last Config Snapshot</span>
                  <span>{configTimestamp ? formatDateTime(configTimestamp) : "Unknown"}</span>
                </div>
                <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-border/50 bg-card/60 p-3">
                  <pre className="text-xs">{JSON.stringify(sanitizedConfig, null, 2)}</pre>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border/50 bg-muted/40 p-4 text-xs text-muted-foreground">
                Unable to fetch configuration from Milesight. Use "Update Config" to push a payload manually.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemetry & Logs */}
        <Card>
          <Tabs defaultValue="telemetry" className="w-full">
            <CardHeader className="flex flex-col gap-3 pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                  <FaChartLine className="h-4 w-4 text-purple-500" />
                  Device Insights
                </CardTitle>
                <TabsList>
                  <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
                  <TabsTrigger value="logs">Recent Logs</TabsTrigger>
                </TabsList>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Switch between latest telemetry records and webhook activity for this device.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="telemetry">
                <DeviceTelemetryTable telemetryData={telemetryData} />
              </TabsContent>
              <TabsContent value="logs">
                <div className="space-y-3">
                  {recentEvents.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                      No logs captured for this device yet.
                    </div>
                  ) : (
                    recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border/50 bg-gradient-to-br from-slate-50 to-white p-3 text-[13px] shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] uppercase">
                          <Badge variant="outline" className="text-[8px]">{event.eventType}</Badge>
                          <span className="text-muted-foreground">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                          {summarizeEventPayload(event.payload)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Technical Details */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase">Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Milesight Device ID:</span>
              <span className="font-mono">{device.deviceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Local Cache ID:</span>
              <span className="font-mono">{device.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDateTime(device.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{formatDateTime(device.updatedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telemetry Records:</span>
              <span className="font-bold">{telemetryData.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

