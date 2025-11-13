import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaUsers } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/data-table/data-table";
import { teamMemberColumns } from "./columns";

async function getTeamMembers() {
  return await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { activityLogs: true },
      },
    },
  });
}

export default async function ManagerTeamPage() {
  const teamMembers = await getTeamMembers();

  return (
    <DashboardLayout requiredRole={[Role.MANAGER, Role.ADMIN]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">TEAM MEMBERS</h1>
          <p className="text-xs text-muted-foreground">
            View and manage your team members
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaUsers className="h-4 w-4 text-blue-500" />
              ALL TEAM MEMBERS ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={teamMemberColumns} data={teamMembers} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

