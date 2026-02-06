import { Role, MilesightDeviceTelemetry } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaCrown, FaUserTie, FaUser } from "react-icons/fa";
import { RealtimeStatsCards } from "@/components/realtime-stats-cards";
import { RealtimeDeviceCard } from "@/components/realtime-device-card";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const [
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    totalDevices,
    onlineDevices,
    totalGateways,
    onlineGateways,
    devicesRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.MANAGER } }),
    prisma.user.count({ where: { role: Role.EMPLOYEE } }),
    prisma.milesightDeviceCache.count(),
    prisma.milesightDeviceCache.count({ where: { lastStatus: "ONLINE" } }),
    prisma.milesightDeviceCache.count({ where: { deviceType: "UG65" } }),
    prisma.milesightDeviceCache.count({ where: { deviceType: "UG65", lastStatus: "ONLINE" } }),
    prisma.milesightDeviceCache.findMany({
      orderBy: [
        { displayOrder: "asc" },
        { lastSyncAt: "desc" },
      ],
    }),
  ]);

  const devices = devicesRaw.sort((a, b) => {
    const orderA = (a.displayOrder && a.displayOrder > 0) ? a.displayOrder : 9999;
    const orderB = (b.displayOrder && b.displayOrder > 0) ? b.displayOrder : 9999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.deviceId.localeCompare(b.deviceId);
  });

  // Fetch telemetry per device (so every device gets its own recent data on the dashboard)
  const telemetryByDevice = new Map<string, Awaited<ReturnType<typeof prisma.milesightDeviceTelemetry.findMany>>>();
  await Promise.all(
    devices.map(async (device) => {
      const list = await prisma.milesightDeviceTelemetry.findMany({
        where: { deviceId: device.deviceId },
        orderBy: { dataTimestamp: "desc" },
        take: 200,
      });
      telemetryByDevice.set(device.deviceId, list);
    })
  );

  const latestByDevice = new Map<string, MilesightDeviceTelemetry>();
  telemetryByDevice.forEach((list, deviceId) => {
    if (list.length > 0) {
      latestByDevice.set(deviceId, list[0]);
    }
  });
  const latestReadings = Array.from(latestByDevice.values());
  const avgTemperature =
    latestReadings.filter((t) => t.temperature !== null).length > 0
      ? latestReadings
          .filter((t) => t.temperature !== null)
          .reduce((sum, t) => sum + (t.temperature || 0), 0) /
        latestReadings.filter((t) => t.temperature !== null).length
      : null;

  // Fetch temperature alerts for all devices
  const temperatureAlerts = await prisma.temperatureAlert.findMany({
    where: {
      deviceId: { in: devices.map(d => d.deviceId) },
    },
  });

  // Create a map of deviceId -> alerts (by channel)
  const alertsByDevice = new Map<string, { CH1?: { min: number; max: number }; CH2?: { min: number; max: number } }>();
  temperatureAlerts.forEach((alert) => {
    if (!alertsByDevice.has(alert.deviceId)) {
      alertsByDevice.set(alert.deviceId, {});
    }
    const deviceAlerts = alertsByDevice.get(alert.deviceId)!;
    if (alert.sensorChannel === "CH1") {
      deviceAlerts.CH1 = { min: alert.minTemperature, max: alert.maxTemperature };
    } else if (alert.sensorChannel === "CH2") {
      deviceAlerts.CH2 = { min: alert.minTemperature, max: alert.maxTemperature };
    } else if (alert.sensorChannel === null) {
      // Single sensor device - apply to CH1
      deviceAlerts.CH1 = { min: alert.minTemperature, max: alert.maxTemperature };
    }
  });

  return {
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    totalDevices,
    onlineDevices,
    avgTemperature,
    totalGateways,
    onlineGateways,
    devices,
    telemetryByDevice,
    alertsByDevice,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const user = await getCurrentUser();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <AutoRefresh intervalMinutes={5} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs">
              Manage users, devices, and monitor system activity
            </p>
          </div>
          <ExportTelemetryButton />
        </div>

        {/* User Stats Cards */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-4">
          <StatsCard
            title="TOTAL USERS"
            value={stats.totalUsers}
            icon={FaUsers}
            iconColor="text-blue-500"
            description="All registered users"
          />
          <StatsCard
            title="ADMINS"
            value={stats.adminCount}
            icon={FaCrown}
            iconColor="text-yellow-500"
            description="System administrators"
          />
          <StatsCard
            title="MANAGERS"
            value={stats.managerCount}
            icon={FaUserTie}
            iconColor="text-purple-500"
            description="Team managers"
          />
          <StatsCard
            title="EMPLOYEES"
            value={stats.employeeCount}
            icon={FaUser}
            iconColor="text-green-500"
            description="Regular employees"
          />
        </div>

        {/* Device Stats Cards - Real-time */}
        <RealtimeStatsCards
          initialTotalDevices={stats.totalDevices}
          initialOnlineDevices={stats.onlineDevices}
          initialAvgTemperature={stats.avgTemperature}
          initialTotalGateways={stats.totalGateways}
          initialOnlineGateways={stats.onlineGateways}
        />

        {/* Device Telemetry Cards - Only TS302 Temperature Sensors */}
        {stats.devices.length > 0 && (
          <div className="grid auto-rows-min gap-4 md:grid-cols-2">
            {stats.devices
              .filter((device) => device.deviceType !== "UG65") // Filter out UG65 gateways
              .map((device) => {
                const deviceTelemetry = stats.telemetryByDevice.get(device.deviceId) || [];
                const deviceAlerts = stats.alertsByDevice.get(device.deviceId);
                return (
                  <RealtimeDeviceCard
                    key={device.id}
                    deviceName={device.name || ""}
                    deviceId={device.deviceId}
                    deviceStatus={device.lastStatus || "UNKNOWN"}
                    deviceType={device.deviceType || undefined}
                    deviceModel={device.deviceType || undefined}
                    initialTelemetryData={deviceTelemetry}
                    userRole={user?.role}
                    sensorNameLeft={device.sensorNameLeft}
                    sensorNameRight={device.sensorNameRight}
                    sensorDisplayOrder={device.sensorDisplayOrder ? JSON.parse(device.sensorDisplayOrder) : null}
                    minTemperatureCH1={deviceAlerts?.CH1?.min ?? null}
                    maxTemperatureCH1={deviceAlerts?.CH1?.max ?? null}
                    minTemperatureCH2={deviceAlerts?.CH2?.min ?? null}
                    maxTemperatureCH2={deviceAlerts?.CH2?.max ?? null}
                  />
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

