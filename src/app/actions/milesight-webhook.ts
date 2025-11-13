"use server";

/**
 * Milesight Webhook Settings Server Actions
 * 
 * SECURITY: ALL actions in this file are ADMIN-ONLY
 * Every function calls requireRole(Role.ADMIN) to enforce access control
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";

/**
 * Get webhook settings
 * SECURITY: ADMIN-ONLY
 */
export async function getWebhookSettings() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const settings = await prisma.milesightWebhookSettings.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return settings;
}

/**
 * Save or update webhook settings
 * SECURITY: ADMIN-ONLY
 */
export async function saveWebhookSettings(formData: FormData) {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const enabled = formData.get("enabled") === "true";
  const webhookUuid = formData.get("webhookUuid") as string | null;
  const webhookSecret = formData.get("webhookSecret") as string | null;
  const verificationToken = formData.get("verificationToken") as string | null;

  try {
    const existingSettings = await prisma.milesightWebhookSettings.findFirst();

    const settingsData = {
      enabled,
      webhookUuid: webhookUuid || null,
      webhookSecret: webhookSecret || null,
      verificationToken: verificationToken || null,
      updatedByUserId: currentUser.id,
    };

    if (existingSettings) {
      await prisma.milesightWebhookSettings.update({
        where: { id: existingSettings.id },
        data: settingsData,
      });
    } else {
      await prisma.milesightWebhookSettings.create({
        data: {
          ...settingsData,
          createdByUserId: currentUser.id,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Updated Milesight webhook settings`,
      },
    });

    revalidatePath("/admin/settings/milesight-webhook");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to save webhook settings",
    };
  }
}

/**
 * Test webhook endpoint
 * SECURITY: ADMIN-ONLY
 */
export async function testWebhook() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const settings = await prisma.milesightWebhookSettings.findFirst();

    if (!settings) {
      return { success: false, error: "Webhook settings not configured" };
    }

    // Build webhook URL with token if configured
    let webhookUrl = `${baseUrl}${settings.callbackPath}`;
    if (settings.verificationToken) {
      webhookUrl += `?token=${settings.verificationToken}`;
    }

    // Send test event to our own webhook
    const testPayload = {
      eventType: "test.webhook",
      deviceId: "test-device-001",
      deviceName: "Test Device",
      timestamp: new Date().toISOString(),
      message: "This is a test webhook event from the settings page",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      await prisma.milesightWebhookSettings.update({
        where: { id: settings.id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: "SUCCESS",
          lastError: null,
        },
      });

      return {
        success: true,
        message: "Test event sent successfully! Check event logs.",
      };
    } else {
      const errorText = await response.text();
      
      await prisma.milesightWebhookSettings.update({
        where: { id: settings.id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: "FAILED",
          lastError: errorText,
        },
      });

      return {
        success: false,
        error: `Webhook test failed: ${errorText}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Test failed: ${error.message}`,
    };
  }
}

/**
 * Get recent webhook events
 * SECURITY: ADMIN-ONLY
 */
export async function getRecentWebhookEvents(limit: number = 10) {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const events = await prisma.milesightWebhookEvent.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return events;
}

/**
 * Clear all webhook events
 * SECURITY: ADMIN-ONLY
 */
export async function clearWebhookEvents() {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    await prisma.milesightWebhookEvent.deleteMany({});

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Cleared all Milesight webhook events`,
      },
    });

    revalidatePath("/admin/settings/milesight-webhook");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

