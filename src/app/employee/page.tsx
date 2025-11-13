import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { FaClipboardList, FaClock, FaCheckCircle } from "react-icons/fa";
import { EmployeeActivityChart } from "@/components/charts/employee-activity-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";

async function getEmployeeStats(userId: string) {
  const [totalActivities, recentActivity, user] = await Promise.all([
    prisma.activityLog.count({ where: { userId } }),
    prisma.activityLog.findMany({
      take: 10,
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  return {
    totalActivities,
    recentActivity,
    user,
  };
}

export default async function EmployeeDashboard() {
  const currentUser = await getCurrentUser();
  const stats = await getEmployeeStats(currentUser!.id);

  return (
    <DashboardLayout requiredRole={Role.EMPLOYEE}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">EMPLOYEE DASHBOARD</h1>
          <p className="text-xs text-muted-foreground">
            Welcome back, {stats.user?.name || currentUser?.email}!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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

        {/* Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaClipboardList className="h-4 w-4 text-blue-500" />
              MY ACTIVITY OVERVIEW
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeActivityChart />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">MY RECENT ACTIVITY</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityTable activities={stats.recentActivity} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

