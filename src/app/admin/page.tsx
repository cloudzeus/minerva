import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaCrown, FaUserTie, FaUser } from "react-icons/fa";
import { RealtimeStatsCards } from "@/components/realtime-stats-cards";
import { RealtimeDeviceCard } from "@/components/realtime-device-card";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";

async function getDashboardStats() {
  const [
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    totalDevices,
    onlineDevices,
    recentTelemetry,
    devices,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.MANAGER } }),
    prisma.user.count({ where: { role: Role.EMPLOYEE } }),
    prisma.milesightDeviceCache.count(),
    prisma.milesightDeviceCache.count({ where: { lastStatus: "ONLINE" } }),
    prisma.milesightDeviceTelemetry.findMany({
      take: 2000, // Increased to fetch more history
      orderBy: { dataTimestamp: "desc" },
    }),
    prisma.milesightDeviceCache.findMany({
      orderBy: { lastSyncAt: "desc" },
    }),
  ]);

  // Calculate averages from latest telemetry
  const latestByDevice = new Map();
  recentTelemetry.forEach((t) => {
    if (!latestByDevice.has(t.deviceId)) {
      latestByDevice.set(t.deviceId, t);
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

  const avgHumidity =
    latestReadings.filter((t) => t.humidity !== null).length > 0
      ? latestReadings
          .filter((t) => t.humidity !== null)
          .reduce((sum, t) => sum + (t.humidity || 0), 0) /
        latestReadings.filter((t) => t.humidity !== null).length
      : null;

  const avgBattery =
    latestReadings.filter((t) => t.battery !== null).length > 0
      ? latestReadings
          .filter((t) => t.battery !== null)
          .reduce((sum, t) => sum + (t.battery || 0), 0) /
        latestReadings.filter((t) => t.battery !== null).length
      : null;

  // Group telemetry by device
  const telemetryByDevice = new Map<string, typeof recentTelemetry>();
  recentTelemetry.forEach((t) => {
    if (!telemetryByDevice.has(t.deviceId)) {
      telemetryByDevice.set(t.deviceId, []);
    }
    telemetryByDevice.get(t.deviceId)!.push(t);
  });

  return {
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    totalDevices,
    onlineDevices,
    avgTemperature,
    avgHumidity,
    avgBattery,
    devices,
    telemetryByDevice,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
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
          initialAvgHumidity={stats.avgHumidity}
          initialAvgBattery={stats.avgBattery}
        />

        {/* Device Telemetry Cards - Individual per Device */}
        {stats.devices.length > 0 && (
          <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.devices.map((device) => {
              const deviceTelemetry = stats.telemetryByDevice.get(device.deviceId) || [];
              return (
                <RealtimeDeviceCard
                  key={device.id}
                  deviceName={device.name || ""}
                  deviceId={device.deviceId}
                  deviceStatus={device.lastStatus || "UNKNOWN"}
                  deviceType={device.deviceType || undefined}
                  deviceModel={device.deviceType || undefined}
                  initialTelemetryData={deviceTelemetry}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

