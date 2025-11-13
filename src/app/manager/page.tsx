import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaTasks, FaChartLine } from "react-icons/fa";
import { ManagerTeamChart } from "@/components/charts/manager-team-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";

async function getManagerStats() {
  const [employeeCount, totalActivities, recentActivity] = await Promise.all([
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
  ]);

  return {
    employeeCount,
    totalActivities,
    recentActivity,
  };
}

export default async function ManagerDashboard() {
  const stats = await getManagerStats();

  return (
    <DashboardLayout requiredRole={Role.MANAGER}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">MANAGER DASHBOARD</h1>
          <p className="text-xs text-muted-foreground">
            Monitor your team performance and activities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaChartLine className="h-4 w-4 text-blue-500" />
                TEAM PERFORMANCE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManagerTeamChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaUsers className="h-4 w-4 text-green-500" />
                TEAM OVERVIEW
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">TEAM RECENT ACTIVITY</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityTable activities={stats.recentActivity} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

