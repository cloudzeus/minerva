/**
 * Milesight Authentication Settings Page
 * 
 * SECURITY: This page is ADMIN-ONLY
 * - Protected by middleware at /admin/* (only ADMIN role)
 * - Server-side guard via DashboardLayout requireRole(Role.ADMIN)
 * - Sidebar menu only visible to ADMIN users
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaKey, FaCloud, FaCircle } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { MilesightSettingsForm } from "./milesight-settings-form";
import { getMilesightConnectionStatus } from "@/lib/milesight";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

async function getMilesightSettings() {
  const settings = await prisma.milesightSettings.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!settings) {
    return null;
  }

  // Mask client secret for security - NEVER send real secret to client
  return {
    ...settings,
    clientSecret: "••••••••",
  };
}

export default async function MilesightSettingsPage() {
  // ADMIN-ONLY: This is enforced by DashboardLayout requireRole check
  const settings = await getMilesightSettings();
  
  const connectionStatus = settings
    ? getMilesightConnectionStatus(settings.accessToken, settings.accessTokenExpiresAt)
    : {
        connected: false,
        status: "disconnected" as const,
        statusLabel: "Not Configured",
        statusColor: "text-gray-500",
      };

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">MILESIGHT AUTHENTICATION</h1>
          <p className="text-xs text-muted-foreground">
            Configure OAuth2 credentials for Milesight Development Platform integration
          </p>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaCloud className="h-4 w-4 text-blue-500" />
              CONNECTION STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FaCircle className={`h-2 w-2 ${connectionStatus.statusColor}`} />
                  <span className="text-sm font-medium">
                    {connectionStatus.statusLabel}
                  </span>
                </div>
                {settings?.accessTokenExpiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Token expires: {formatDateTime(settings.accessTokenExpiresAt)}
                  </p>
                )}
                {settings?.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {formatDateTime(settings.updatedAt)}
                  </p>
                )}
              </div>
              <Badge
                variant={connectionStatus.connected ? "default" : "secondary"}
                className="gap-1 text-xs"
              >
                {connectionStatus.connected ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Settings Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaKey className="h-4 w-4 text-cyan-500" />
              OAUTH2 CREDENTIALS
            </CardTitle>
            <CardDescription className="text-xs">
              Configure your Milesight Development Platform application credentials.
              Tokens will be automatically requested and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MilesightSettingsForm initialSettings={settings} />
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase">SETUP INSTRUCTIONS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="font-medium">To obtain your credentials:</p>
            <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
              <li>Login to your Milesight Development Platform account</li>
              <li>Navigate to Application Management</li>
              <li>Create a new OAuth2 application or use an existing one</li>
              <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
              <li>Note your region's API base URL:
                <ul className="ml-4 mt-1 list-disc">
                  <li><strong>EU:</strong> https://eu-openapi.milesight.com</li>
                  <li><strong>US:</strong> https://us-openapi.milesight.com</li>
                  <li><strong>Other:</strong> Check Milesight documentation</li>
                </ul>
              </li>
              <li>Enter the credentials below</li>
              <li>Click "Save Only" first, then "Refresh Token" to test</li>
            </ol>
            <p className="mt-3 text-muted-foreground">
              <strong>Note:</strong> Your client secret is stored securely in the database
              and never exposed in the browser. Tokens are automatically refreshed when needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

