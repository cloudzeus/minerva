import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { FaClipboardList, FaClock, FaCheckCircle } from "react-icons/fa";
import { EmployeeActivityChart } from "@/components/charts/employee-activity-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";
import { RealtimeStatsCards } from "@/components/realtime-stats-cards";
import { RealtimeDeviceCard } from "@/components/realtime-device-card";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";

async function getEmployeeStats(userId: string) {
  const [
    totalActivities,
    recentActivity,
    user,
    totalDevices,
    onlineDevices,
    totalGateways,
    onlineGateways,
    recentTelemetry,
    devices,
  ] = await Promise.all([
    prisma.activityLog.count({ where: { userId } }),
    prisma.activityLog.findMany({
      take: 10,
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.milesightDeviceCache.count(),
    prisma.milesightDeviceCache.count({ where: { lastStatus: "ONLINE" } }),
    prisma.milesightDeviceCache.count({ where: { deviceType: "UG65" } }),
    prisma.milesightDeviceCache.count({ where: { deviceType: "UG65", lastStatus: "ONLINE" } }),
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

  // Group telemetry by device
  const telemetryByDevice = new Map<string, typeof recentTelemetry>();
  recentTelemetry.forEach((t) => {
    if (!telemetryByDevice.has(t.deviceId)) {
      telemetryByDevice.set(t.deviceId, []);
    }
    telemetryByDevice.get(t.deviceId)!.push(t);
  });

  return {
    totalActivities,
    recentActivity,
    user,
    totalDevices,
    onlineDevices,
    avgTemperature,
    totalGateways,
    onlineGateways,
    devices,
    telemetryByDevice,
  };
}

export default async function EmployeeDashboard() {
  const currentUser = await getCurrentUser();
  const stats = await getEmployeeStats(currentUser!.id);
  const user = currentUser;

  return (
    <DashboardLayout requiredRole={Role.EMPLOYEE}>
      <AutoRefresh intervalMinutes={5} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Employee Dashboard</h1>
            <p className="text-muted-foreground text-xs">
              Welcome back, {stats.user?.name || currentUser?.email}!
            </p>
          </div>
          <ExportTelemetryButton />
        </div>

        {/* Stats Cards */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <StatsCard
            title="MY ACTIVITIES"
            value={stats.totalActivities}
            icon={FaClipboardList}
            iconColor="text-blue-500"
            description="Total recorded activities"
          />
          <StatsCard
            title="TASKS COMPLETED"
            value="42"
            icon={FaCheckCircle}
            iconColor="text-green-500"
            description="This month"
          />
          <StatsCard
            title="HOURS LOGGED"
            value="156"
            icon={FaClock}
            iconColor="text-purple-500"
            description="This month"
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
                  userRole={user?.role}
                />
              );
            })}
          </div>
        )}

        {/* Activity Charts */}
        <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <FaClipboardList className="h-4 w-4 text-blue-600" />
              My Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <EmployeeActivityChart />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle>My Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <RecentActivityTable activities={stats.recentActivity} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

