import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaTasks, FaChartLine } from "react-icons/fa";
import { ManagerTeamChart } from "@/components/charts/manager-team-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";
import { RealtimeStatsCards } from "@/components/realtime-stats-cards";
import { RealtimeDeviceCard } from "@/components/realtime-device-card";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";

async function getManagerStats() {
  const [
    employeeCount,
    totalActivities,
    recentActivity,
    totalDevices,
    onlineDevices,
    recentTelemetry,
    devices,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.EMPLOYEE } }),
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: true },
      where: {
        user: {
          role: Role.EMPLOYEE,
        },
      },
    }),
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
    employeeCount,
    totalActivities,
    recentActivity,
    totalDevices,
    onlineDevices,
    avgTemperature,
    avgHumidity,
    avgBattery,
    devices,
    telemetryByDevice,
  };
}

export default async function ManagerDashboard() {
  const stats = await getManagerStats();

  return (
    <DashboardLayout requiredRole={Role.MANAGER}>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Manager Dashboard</h1>
            <p className="text-muted-foreground text-xs">
              Monitor team performance, devices, and activities
            </p>
          </div>
          <ExportTelemetryButton />
        </div>

        {/* Stats Cards */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <StatsCard
            title="TEAM MEMBERS"
            value={stats.employeeCount}
            icon={FaUsers}
            iconColor="text-blue-500"
            description="Total employees"
          />
          <StatsCard
            title="TOTAL ACTIVITIES"
            value={stats.totalActivities}
            icon={FaTasks}
            iconColor="text-green-500"
            description="All system activities"
          />
          <StatsCard
            title="PERFORMANCE"
            value="94%"
            icon={FaChartLine}
            iconColor="text-purple-500"
            description="Team efficiency"
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

        {/* Team Performance Charts */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <FaChartLine className="h-4 w-4 text-blue-600" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManagerTeamChart />
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <FaUsers className="h-4 w-4 text-green-600" />
                Team Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="space-y-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {stats.employeeCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total team members under management
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Employee Activity */}
        <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle>Team Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <RecentActivityTable activities={stats.recentActivity} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

