/**
 * Milesight Webhook Settings Page
 * 
 * SECURITY: This page is ADMIN-ONLY
 * - Protected by middleware at /admin/* (only ADMIN role)
 * - Server-side guard via DashboardLayout requireRole(Role.ADMIN)
 * - Sidebar menu only visible to ADMIN users
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaWifi, FaCircle, FaCopy, FaCheckCircle } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import { MilesightWebhookSettingsForm } from "./milesight-webhook-settings-form";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { WebhookUrlDisplay } from "@/components/webhook-url-display";
import { LiveWebhookIndicator } from "@/components/live-webhook-indicator";
import { RecentWebhookEvents } from "@/components/recent-webhook-events";

async function getWebhookSettings() {
  const settings = await prisma.milesightWebhookSettings.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return settings;
}

async function getRecentEvents() {
  return await prisma.milesightWebhookEvent.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export default async function MilesightWebhookPage() {
  const settings = await getWebhookSettings();
  const recentEvents = await getRecentEvents();

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const callbackPath = settings?.callbackPath || "/api/webhooks/milesight";
  let webhookUrl = `${baseUrl}${callbackPath}`;

  // Add verification token to URL if configured
  if (settings?.verificationToken) {
    webhookUrl += `?token=${settings.verificationToken}`;
  }

  const isActive = settings?.enabled || false;
  const hasRecentActivity = settings?.lastEventAt
    ? new Date().getTime() - new Date(settings.lastEventAt).getTime() < 5 * 60 * 1000 // Last 5 minutes
    : false;

  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase">MILESIGHT WEBHOOK</h1>
            <p className="text-xs text-muted-foreground">
              Configure webhook endpoint to receive real-time device events
            </p>
          </div>
          <LiveWebhookIndicator
            isActive={isActive}
            hasRecentActivity={hasRecentActivity}
            lastEventAt={settings?.lastEventAt}
          />
        </div>

        {/* Webhook Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaWifi className="h-4 w-4 text-teal-500" />
              WEBHOOK STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={isActive ? "default" : "secondary"} className="gap-1 text-xs">
                  <FaCircle className={isActive ? "text-green-500" : "text-gray-500"} />
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Events Received</p>
                <p className="text-lg font-bold">{settings?.totalEventsCount || 0}</p>
              </div>
              {settings?.lastEventAt && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Last Event</p>
                    <p className="text-xs">{formatDateTime(settings.lastEventAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Last Event Type</p>
                    <p className="text-xs font-mono">{settings.lastEventType || "—"}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhook URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaCopy className="h-4 w-4 text-blue-500" />
              WEBHOOK CALLBACK URL
            </CardTitle>
            <CardDescription className="text-xs">
              Copy this URL and paste it into Milesight Development Platform → Application → Settings → Webhook → Callback URI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookUrlDisplay url={webhookUrl} />
          </CardContent>
        </Card>

        {/* Settings Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaCheckCircle className="h-4 w-4 text-green-500" />
              WEBHOOK CONFIGURATION
            </CardTitle>
            <CardDescription className="text-xs">
              Enable/disable webhook and configure security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MilesightWebhookSettingsForm initialSettings={settings} />
          </CardContent>
        </Card>

        {/* Recent Events Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaWifi className="h-4 w-4 text-purple-500" />
              RECENT EVENTS ({recentEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentWebhookEvents events={recentEvents} />
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase">SETUP INSTRUCTIONS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="font-medium">To configure webhook in Milesight:</p>
            <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
              <li>Login to Milesight Development Platform</li>
              <li>Navigate to your Application → Settings → Webhook</li>
              <li>Milesight will provide you with a <strong>Webhook UUID</strong> and <strong>Webhook Secret</strong></li>
              <li>Copy the Webhook URL from above and paste it into Milesight "Callback URI"</li>
              <li>In the form below, enter the UUID and Secret provided by Milesight</li>
              <li>Enable the webhook toggle</li>
              <li>Click "SAVE SETTINGS"</li>
              <li>Click "TEST WEBHOOK" to verify it works</li>
            </ol>
            <p className="mt-3 text-muted-foreground">
              <strong>Note:</strong> The UUID and Secret are provided by Milesight for secure webhook delivery.
              Enter them in the configuration form below.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

