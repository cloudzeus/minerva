/**
 * Cron Jobs Service
 * 
 * This module sets up and manages all scheduled tasks using node-cron.
 * All cron jobs are registered here and start automatically when the app starts.
 */

import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { requestMilesightToken } from "@/lib/milesight";
import {
  monitorCriticalDevices,
  backfillCriticalDevices,
  pollCriticalDeviceConfigs,
} from "@/lib/device-monitor";

/**
 * Refresh Milesight Access Token
 * 
 * Runs every 30 minutes to check if token needs refreshing.
 * Refreshes token if it expires within 5 minutes.
 */
async function refreshMilesightToken() {
  try {
    console.log("=".repeat(80));
    console.log("[Cron] Starting automatic token refresh check...");
    console.log("[Cron] Time:", new Date().toISOString());
    console.log("=".repeat(80));

    // Get current Milesight settings
    const settings = await prisma.milesightSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!settings || !settings.enabled) {
      console.log("[Cron] ⚠️ Milesight integration not configured or disabled");
      return;
    }

    // Check if token exists
    if (!settings.accessToken) {
      console.log("[Cron] ⚠️ No access token found");
      return;
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = settings.accessTokenExpiresAt;
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (!expiresAt) {
      console.log("[Cron] ⚠️ No expiration time set for token");
      return;
    }

    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const isExpiredOrExpiringSoon = timeUntilExpiry <= bufferTime;

    console.log("[Cron] Token expiration check:");
    console.log("  - Current time:", now.toISOString());
    console.log("  - Token expires at:", expiresAt.toISOString());
    console.log("  - Time until expiry:", Math.round(timeUntilExpiry / 1000 / 60), "minutes");
    console.log("  - Needs refresh?", isExpiredOrExpiringSoon);

    if (!isExpiredOrExpiringSoon) {
      console.log("[Cron] ✅ Token is still valid, no refresh needed");
      console.log("=".repeat(80));
      return;
    }

    // Token needs refresh
    console.log("[Cron] 🔄 Token expired or expiring soon, refreshing...");

    // Request new token
    const tokenResponse = await requestMilesightToken({
      baseUrl: settings.baseUrl,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
    });

    // Calculate new expiration time
    const newExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Update database
    await prisma.milesightSettings.update({
      where: { id: settings.id },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || settings.refreshToken,
        accessTokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });

    console.log("[Cron] ✅ Token refreshed successfully!");
    console.log("  - New token expires at:", newExpiresAt.toISOString());
    console.log("  - Valid for:", tokenResponse.expires_in, "seconds");
    console.log("=".repeat(80));
  } catch (error: any) {
    console.error("[Cron] ❌ Failed to refresh token:", error);
    console.error("[Cron] Error details:", error.message);
    console.log("=".repeat(80));
  }
}

/**
 * Initialize and start all cron jobs
 */
export function startCronJobs() {
  console.log("=".repeat(80));
  console.log("[Cron] Initializing cron jobs...");
  console.log("=".repeat(80));

  // Job 1: Refresh Milesight Token
  // Runs every 30 minutes: */30 * * * *
  const tokenRefreshJob = cron.schedule(
    "*/30 * * * *",
    async () => {
      await refreshMilesightToken();
    },
    {
      scheduled: true,
      timezone: "Europe/Athens", // Adjust to your timezone
    }
  );

  console.log("[Cron] ✅ Token refresh job scheduled (every 30 minutes)");
  console.log("[Cron] Timezone: Europe/Athens");
  console.log("=".repeat(80));

  const deviceMonitorJob = cron.schedule(
    "*/30 * * * *",
    async () => {
      await monitorCriticalDevices();
    },
    {
      scheduled: true,
      timezone: "Europe/Athens",
    }
  );

  console.log("[Cron] ✅ Device heartbeat job scheduled (every 30 minutes)");
  console.log("=".repeat(80));

  const deviceBackfillJob = cron.schedule(
    "*/10 * * * *",
    async () => {
      await backfillCriticalDevices();
    },
    {
      scheduled: true,
      timezone: "Europe/Athens",
    }
  );

  console.log("[Cron] ✅ Console backfill job scheduled (every 10 minutes)");
  console.log("=".repeat(80));

  const deviceConfigPollJob = cron.schedule(
    "*/10 * * * *",
    async () => {
      await pollCriticalDeviceConfigs();
    },
    {
      scheduled: true,
      timezone: "Europe/Athens",
    }
  );

  console.log("[Cron] ✅ Device config poll scheduled (every 10 minutes)");
  console.log("=".repeat(80));

  // Optionally run token refresh immediately on startup
  // This ensures token is fresh when app starts
  console.log("[Cron] Running initial token refresh check...");
  refreshMilesightToken().catch((error) => {
    console.error("[Cron] Initial token refresh failed:", error);
  });

  console.log("[Cron] Running initial device heartbeat check...");
  monitorCriticalDevices().catch((error) => {
    console.error("[Cron] Initial device monitor failed:", error);
  });
  console.log("[Cron] Running initial console backfill check...");
  backfillCriticalDevices().catch((error) => {
    console.error("[Cron] Initial backfill failed:", error);
  });
  console.log("[Cron] Running initial device config poll...");
  pollCriticalDeviceConfigs().catch((error) => {
    console.error("[Cron] Initial config poll failed:", error);
  });

  // Return job references for potential management
  return {
    tokenRefreshJob,
    deviceMonitorJob,
    deviceBackfillJob,
    deviceConfigPollJob,
  };
}

/**
 * Stop all cron jobs (useful for cleanup)
 */
export function stopCronJobs() {
  cron.getTasks().forEach((task) => task.stop());
  console.log("[Cron] All cron jobs stopped");
}

