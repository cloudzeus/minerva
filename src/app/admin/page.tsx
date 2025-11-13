import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaCrown, FaUserTie, FaUser, FaChartLine } from "react-icons/fa";
import { AdminActivityChart } from "@/components/charts/admin-activity-chart";
import { AdminUsersChart } from "@/components/charts/admin-users-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";
import { DeviceStatsCards } from "@/components/device-stats-cards";
import { DeviceTelemetryCard } from "@/components/device-telemetry-card";
import { ExportTelemetryButton } from "@/components/export-telemetry-button";

async function getDashboardStats() {
  const [
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    recentActivity,
    totalDevices,
    onlineDevices,
    recentTelemetry,
    devices,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.MANAGER } }),
    prisma.user.count({ where: { role: Role.EMPLOYEE } }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.milesightDeviceCache.count(),
    prisma.milesightDeviceCache.count({ where: { lastStatus: "ONLINE" } }),
    prisma.milesightDeviceTelemetry.findMany({
      take: 200,
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

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase">ADMIN DASHBOARD</h1>
            <p className="text-xs text-muted-foreground">
              Manage users, devices, and monitor system activity
            </p>
          </div>
          <ExportTelemetryButton />
        </div>

        {/* User Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Device Stats Cards */}
        <DeviceStatsCards
          totalDevices={stats.totalDevices}
          onlineDevices={stats.onlineDevices}
          avgTemperature={stats.avgTemperature}
          avgHumidity={stats.avgHumidity}
          avgBattery={stats.avgBattery}
        />

        {/* Device Telemetry Cards - Individual per Device */}
        {stats.devices.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.devices.map((device) => {
              const deviceTelemetry = stats.telemetryByDevice.get(device.deviceId) || [];
              return (
                <DeviceTelemetryCard
                  key={device.id}
                  deviceName={device.name || ""}
                  deviceId={device.deviceId}
                  deviceStatus={device.lastStatus || "UNKNOWN"}
                  telemetryData={deviceTelemetry}
                />
              );
            })}
          </div>
        )}

        {/* User Activity Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaChartLine className="h-4 w-4 text-blue-500" />
                USER DISTRIBUTION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminUsersChart
                data={[
                  { role: "Admin", count: stats.adminCount },
                  { role: "Manager", count: stats.managerCount },
                  { role: "Employee", count: stats.employeeCount },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaChartLine className="h-4 w-4 text-green-500" />
                ACTIVITY OVERVIEW
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminActivityChart />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">RECENT ACTIVITY</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityTable activities={stats.recentActivity} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

