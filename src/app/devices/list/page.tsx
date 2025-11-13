import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { DeviceListTable } from "./device-list-table";

async function getAllDevices() {
  return await prisma.milesightDeviceCache.findMany({
    include: {
      _count: {
        select: { telemetryData: true },
      },
    },
    orderBy: { lastSyncAt: "desc" },
  });
}

export default async function DeviceListPage() {
  const devices = await getAllDevices();

  return (
    <DashboardLayout requiredRole={Role.EMPLOYEE}>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Device List</h1>
          <p className="text-muted-foreground text-xs">
            View all devices and their telemetry data
          </p>
        </div>

        <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm">All Devices ({devices.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DeviceListTable devices={devices} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

