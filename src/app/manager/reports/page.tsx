import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaChartLine, FaFileAlt } from "react-icons/fa";
import { ManagerTeamChart } from "@/components/charts/manager-team-chart";

export default async function ManagerReportsPage() {
  return (
    <DashboardLayout requiredRole={[Role.MANAGER, Role.ADMIN]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">REPORTS</h1>
          <p className="text-xs text-muted-foreground">
            Team performance reports and analytics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaChartLine className="h-4 w-4 text-blue-500" />
                WEEKLY PERFORMANCE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManagerTeamChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaFileAlt className="h-4 w-4 text-green-500" />
                REPORT SUMMARY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-medium">Total Tasks</span>
                  <span className="text-base font-bold">319</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-medium">Completed</span>
                  <span className="text-base font-bold text-green-500">298</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-medium">In Progress</span>
                  <span className="text-base font-bold text-yellow-500">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Pending</span>
                  <span className="text-base font-bold text-blue-500">3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

