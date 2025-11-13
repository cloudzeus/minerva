/**
 * Milesight Device Detail Page
 * 
 * SECURITY: ADMIN-ONLY
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaMicrochip, FaCircle, FaArrowLeft, FaChartLine } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDeviceDetails } from "@/app/actions/milesight-devices";
import { DeviceTelemetryTable } from "@/components/device-telemetry-table";

async function getDeviceFromCache(deviceId: string) {
  return await prisma.milesightDeviceCache.findUnique({
    where: { deviceId },
    include: {
      telemetryData: {
        take: 50,
        orderBy: { dataTimestamp: "desc" },
      },
    },
  });
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  
  // Try to get fresh data from Milesight API
  const freshDataResult = await getDeviceDetails(deviceId);
  
  // Fallback to cache if API fails
  let device = freshDataResult.data;
  if (!device) {
    const cachedDevice = await getDeviceFromCache(deviceId);
    if (!cachedDevice) {
      notFound();
    }
    device = cachedDevice;
  }

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/devices/milesight">
              <FaArrowLeft className="mr-2 h-3 w-3" />
              BACK
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold uppercase">DEVICE DETAILS</h1>
            <p className="text-xs text-muted-foreground">
              {device.name || device.sn || device.deviceId}
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaMicrochip className="h-4 w-4 text-indigo-500" />
              DEVICE INFORMATION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Device Name</p>
                <p className="text-sm">{device.name || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                {device.lastStatus ? (
                  <Badge
                    variant={device.lastStatus === "ONLINE" ? "default" : "secondary"}
                    className="gap-1 text-xs"
                  >
                    <FaCircle
                      className={
                        device.lastStatus === "ONLINE"
                          ? "text-green-500"
                          : "text-gray-500"
                      }
                    />
                    {device.lastStatus}
                  </Badge>
                ) : (
                  <p className="text-sm">—</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Serial Number</p>
                <p className="font-mono text-sm">{device.sn || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Device Type</p>
                <p className="text-sm">{device.deviceType || "—"}</p>
              </div>

              {device.devEUI && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">DevEUI</p>
                  <p className="font-mono text-sm">{device.devEUI}</p>
                </div>
              )}

              {device.imei && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">IMEI</p>
                  <p className="font-mono text-sm">{device.imei}</p>
                </div>
              )}

              {device.tag && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tag</p>
                  <Badge variant="outline" className="text-xs">
                    {device.tag}
                  </Badge>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Last Synced</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(device.lastSyncAt)}
                </p>
              </div>
            </div>

            {device.description && (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{device.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemetry Data Card */}
        {device.telemetryData && device.telemetryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase">
                <FaChartLine className="h-4 w-4 text-purple-500" />
                TELEMETRY DATA ({device.telemetryData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceTelemetryTable telemetryData={device.telemetryData} />
            </CardContent>
          </Card>
        )}

        {/* Technical Details Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase">TECHNICAL DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Milesight Device ID:</span>
              <span className="font-mono">{device.deviceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Local Cache ID:</span>
              <span className="font-mono">{device.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDateTime(device.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{formatDateTime(device.updatedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telemetry Records:</span>
              <span className="font-bold">{device.telemetryData?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

