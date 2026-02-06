import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaClipboardList } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/data-table/data-table";
import { activityColumns } from "./columns";

export const dynamic = "force-dynamic";

async function getActivityLogs() {
  return await prisma.activityLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}

export default async function ActivityLogsPage() {
  const activities = await getActivityLogs();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">ACTIVITY LOGS</h1>
          <p className="text-xs text-muted-foreground">
            Monitor all system activities and user actions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaClipboardList className="h-4 w-4 text-purple-500" />
              ALL ACTIVITIES ({activities.length})
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

