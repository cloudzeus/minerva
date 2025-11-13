import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaClipboardList } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { DataTable } from "@/components/data-table/data-table";
import { activityColumns } from "@/app/admin/activity/columns";

async function getMyActivity(userId: string) {
  return await prisma.activityLog.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}

export default async function EmployeeActivityPage() {
  const currentUser = await getCurrentUser();
  const activities = await getMyActivity(currentUser!.id);

  return (
    <DashboardLayout requiredRole={Role.EMPLOYEE}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">MY ACTIVITY</h1>
          <p className="text-xs text-muted-foreground">
            View your personal activity history
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaClipboardList className="h-4 w-4 text-purple-500" />
              MY ACTIVITIES ({activities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={activityColumns} data={activities} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

