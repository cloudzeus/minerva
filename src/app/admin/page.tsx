import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { FaUsers, FaCrown, FaUserTie, FaUser, FaChartLine } from "react-icons/fa";
import { AdminActivityChart } from "@/components/charts/admin-activity-chart";
import { AdminUsersChart } from "@/components/charts/admin-users-chart";
import { RecentActivityTable } from "@/components/recent-activity-table";

async function getDashboardStats() {
  const [totalUsers, adminCount, managerCount, employeeCount, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.MANAGER } }),
      prisma.user.count({ where: { role: Role.EMPLOYEE } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      }),
    ]);

  return {
    totalUsers,
    adminCount,
    managerCount,
    employeeCount,
    recentActivity,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">ADMIN DASHBOARD</h1>
          <p className="text-xs text-muted-foreground">
            Manage users and monitor system activity
          </p>
        </div>

        {/* Stats Cards */}
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

        {/* Charts */}
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

