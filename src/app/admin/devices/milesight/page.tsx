/**
 * Milesight Device Management Page
 * 
 * SECURITY: This page is ADMIN-ONLY
 * - Protected by middleware at /admin/* (only ADMIN role)
 * - Server-side guard via DashboardLayout requireRole(Role.ADMIN)
 * - Sidebar menu only visible to ADMIN users
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaMicrochip, FaExclamationTriangle } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { DevicesDataTable } from "./devices-data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function checkMilesightAuth() {
  const settings = await prisma.milesightSettings.findFirst();
  return {
    configured: !!settings,
    enabled: settings?.enabled || false,
    hasToken: !!settings?.accessToken,
  };
}

async function getDevicesFromCache() {
  return await prisma.milesightDeviceCache.findMany({
    orderBy: { lastSyncAt: "desc" },
  });
}

export default async function MilesightDevicesPage() {
  const authStatus = await checkMilesightAuth();
  const devices = await getDevicesFromCache();

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">MILESIGHT DEVICE MANAGEMENT</h1>
          <p className="text-xs text-muted-foreground">
            Manage all your Milesight IoT devices from the cloud platform
          </p>
        </div>

        {/* Auth Warning */}
        {(!authStatus.configured || !authStatus.enabled || !authStatus.hasToken) && (
          <Alert variant="destructive">
            <FaExclamationTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Milesight Not Connected</AlertTitle>
            <AlertDescription className="text-xs">
              {!authStatus.configured && (
                <p>Milesight authentication is not configured.</p>
              )}
              {authStatus.configured && !authStatus.enabled && (
                <p>Milesight integration is disabled.</p>
              )}
              {authStatus.configured && authStatus.enabled && !authStatus.hasToken && (
                <p>No access token available.</p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-2 text-xs">
                <Link href="/admin/settings/milesight">
                  Configure Milesight Authentication
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Devices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaMicrochip className="h-4 w-4 text-indigo-500" />
              ALL DEVICES ({devices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DevicesDataTable
              devices={devices}
              canManage={authStatus.configured && authStatus.enabled && authStatus.hasToken}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

