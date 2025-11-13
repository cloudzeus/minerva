import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaUsers } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { UsersDataTableEnhanced } from "@/components/users-data-table-enhanced";

async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { activityLogs: true },
      },
    },
  });
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">USER MANAGEMENT</h1>
          <p className="text-xs text-muted-foreground">
            Manage all system users and their roles
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaUsers className="h-4 w-4 text-blue-500" />
              ALL USERS ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsersDataTableEnhanced users={users} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

