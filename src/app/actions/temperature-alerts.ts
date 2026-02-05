"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendTemperatureAlertRecipientDisabledEmail } from "@/lib/email";

/** Recipient with optional per-email notification toggle (default true for backward compat) */
export type EmailRecipientInput = string | { email: string; enabled?: boolean };

export interface TemperatureAlertSettings {
  deviceId: string;
  deviceName?: string; // Used for "recipient disabled" notification emails
  sensorChannel?: string | null; // "CH1", "CH2", or null for single sensor
  minTemperature: number;
  maxTemperature: number;
  emailRecipients: EmailRecipientInput[];
  enabled: boolean;
  alertCooldown?: number;
}

function normalizeEmailRecipients(
  raw: EmailRecipientInput[]
): { email: string; enabled: boolean }[] {
  return raw
    .map((r) =>
      typeof r === "string"
        ? { email: r.trim(), enabled: true }
        : { email: (r.email || "").trim(), enabled: r.enabled !== false }
    )
    .filter((r) => r.email !== "");
}

/** Parse stored emailRecipients JSON to get emails that were previously enabled (for "disabled" notifications) */
function getPreviouslyEnabledEmails(rawJson: string): Set<string> {
  try {
    const arr = JSON.parse(rawJson);
    if (!Array.isArray(arr)) return new Set();
    const set = new Set<string>();
    for (const item of arr) {
      if (typeof item === "string") {
        const e = item.trim().toLowerCase();
        if (e) set.add(e);
      } else if (item && typeof item === "object" && "email" in item) {
        const email = String((item as { email?: string }).email || "").trim().toLowerCase();
        const enabled = (item as { enabled?: boolean }).enabled !== false;
        if (email && enabled) set.add(email);
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

/**
 * Get temperature alert settings for a device
 * Returns all alerts for the device (CH1, CH2, or single sensor)
 */
export async function getTemperatureAlert(deviceId: string, sensorChannel?: string | null) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    if (sensorChannel !== undefined) {
      // Get specific channel alert
      // Use findFirst when sensorChannel is null (MySQL unique constraint limitation)
      if (sensorChannel === null || sensorChannel === undefined) {
        const alert = await prisma.temperatureAlert.findFirst({
          where: {
            deviceId,
            sensorChannel: null,
          },
        });

        if (!alert) {
          return null;
        }

        return {
          ...alert,
          emailRecipients: JSON.parse(alert.emailRecipients),
        };
      } else {
        // Use unique constraint when sensorChannel is a string
        const alert = await prisma.temperatureAlert.findUnique({
          where: { 
            deviceId_sensorChannel: {
              deviceId,
              sensorChannel: sensorChannel,
            }
          },
        });

        if (!alert) {
          return null;
        }

        return {
          ...alert,
          emailRecipients: JSON.parse(alert.emailRecipients),
        };
      }
    } else {
      // Get all alerts for the device
      const alerts = await prisma.temperatureAlert.findMany({
        where: { deviceId },
      });

      return alerts.map(alert => ({
        ...alert,
        emailRecipients: JSON.parse(alert.emailRecipients),
      }));
    }
  } catch (error: any) {
    console.error("[Temperature Alert] Failed to get alert:", error);
    throw new Error("Failed to retrieve alert settings");
  }
}

/**
 * Save or update temperature alert settings
 */
export async function saveTemperatureAlert(settings: TemperatureAlertSettings) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    const recipients = normalizeEmailRecipients(settings.emailRecipients);
    const validRecipients = recipients.filter((r) => r.email.includes("@"));

    if (validRecipients.length === 0) {
      return {
        success: false,
        error: "At least one valid email address is required",
      };
    }

    // Validate temperature range
    if (settings.minTemperature >= settings.maxTemperature) {
      return {
        success: false,
        error: "Minimum temperature must be less than maximum temperature",
      };
    }

    const channelValue: string | null = settings.sensorChannel ?? null;
    const deviceName = settings.deviceName || `Device ${settings.deviceId}`;
    const channelLabel = channelValue === null ? null : channelValue;

    // Capture old emailRecipients before update (for "disabled" notifications)
    let oldEmailRecipientsRaw: string | null = null;

    // Use findFirst + update/create when sensorChannel is null (MySQL unique constraint limitation)
    let alert;
    if (channelValue === null) {
      const existing = await prisma.temperatureAlert.findFirst({
        where: {
          deviceId: settings.deviceId,
          sensorChannel: null,
        },
      });

      if (existing) {
        oldEmailRecipientsRaw = existing.emailRecipients;
        alert = await prisma.temperatureAlert.update({
          where: { id: existing.id },
          data: {
            minTemperature: settings.minTemperature,
            maxTemperature: settings.maxTemperature,
            emailRecipients: JSON.stringify(validRecipients),
            enabled: settings.enabled,
            alertCooldown: settings.alertCooldown || 300,
          },
        });
      } else {
        alert = await prisma.temperatureAlert.create({
          data: {
            deviceId: settings.deviceId,
            sensorChannel: null,
            minTemperature: settings.minTemperature,
            maxTemperature: settings.maxTemperature,
            emailRecipients: JSON.stringify(validRecipients),
            enabled: settings.enabled,
            alertCooldown: settings.alertCooldown || 300,
          },
        });
      }
    } else {
      const existing = await prisma.temperatureAlert.findUnique({
        where: {
          deviceId_sensorChannel: {
            deviceId: settings.deviceId,
            sensorChannel: channelValue,
          },
        },
      });
      if (existing) oldEmailRecipientsRaw = existing.emailRecipients;

      // Use unique constraint when sensorChannel is a string
      alert = await prisma.temperatureAlert.upsert({
        where: { 
          deviceId_sensorChannel: {
            deviceId: settings.deviceId,
            sensorChannel: channelValue,
          }
        },
        create: {
          deviceId: settings.deviceId,
          sensorChannel: channelValue,
          minTemperature: settings.minTemperature,
          maxTemperature: settings.maxTemperature,
          emailRecipients: JSON.stringify(validRecipients),
          enabled: settings.enabled,
          alertCooldown: settings.alertCooldown || 300,
        },
        update: {
          minTemperature: settings.minTemperature,
          maxTemperature: settings.maxTemperature,
          emailRecipients: JSON.stringify(validRecipients),
          enabled: settings.enabled,
          alertCooldown: settings.alertCooldown || 300,
        },
      });
    }

    // Send "you've been disabled" email to recipients who were enabled and are now disabled
    if (oldEmailRecipientsRaw) {
      const previouslyEnabled = getPreviouslyEnabledEmails(oldEmailRecipientsRaw);
      const toNotify = validRecipients.filter(
        (r) => !r.enabled && previouslyEnabled.has(r.email.toLowerCase())
      );
      await Promise.allSettled(
        toNotify.map((r) =>
          sendTemperatureAlertRecipientDisabledEmail({
            deviceName,
            recipientEmail: r.email,
            channelLabel,
          })
        )
      );
    }

    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/employee");
    revalidatePath(`/devices/${settings.deviceId}`);

    return {
      success: true,
      alert: {
        ...alert,
        emailRecipients: JSON.parse(alert.emailRecipients),
      },
    };
  } catch (error: any) {
    console.error("[Temperature Alert] Failed to save alert:", error);
    return {
      success: false,
      error: error.message || "Failed to save alert settings",
    };
  }
}

/**
 * Toggle temperature alert enabled state (notifications on/off).
 * Saves immediately so the switch can persist without clicking Save.
 */
export async function setTemperatureAlertEnabled(
  deviceId: string,
  sensorChannel: string | null,
  enabled: boolean
) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    const channelValue: string | null = sensorChannel ?? null;

    if (channelValue === null) {
      const existing = await prisma.temperatureAlert.findFirst({
        where: {
          deviceId,
          sensorChannel: null,
        },
      });

      if (existing) {
        await prisma.temperatureAlert.update({
          where: { id: existing.id },
          data: { enabled },
        });
      } else {
        return {
          success: false,
          error: "No alert configured for this device. Add email recipients and save first.",
        };
      }
    } else {
      const existing = await prisma.temperatureAlert.findUnique({
        where: {
          deviceId_sensorChannel: {
            deviceId,
            sensorChannel: channelValue,
          },
        },
      });

      if (existing) {
        await prisma.temperatureAlert.update({
          where: { id: existing.id },
          data: { enabled },
        });
      } else {
        return {
          success: false,
          error: `No alert configured for ${channelValue}. Add email recipients and save first.`,
        };
      }
    }

    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/employee");
    revalidatePath(`/devices/${deviceId}`);

    return { success: true };
  } catch (error: any) {
    console.error("[Temperature Alert] Failed to set enabled:", error);
    return {
      success: false,
      error: error.message || "Failed to update notifications",
    };
  }
}

/**
 * Delete temperature alert
 */
export async function deleteTemperatureAlert(deviceId: string, sensorChannel?: string | null) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    const channelValue: string | null = sensorChannel ?? null;
    
    // Use findFirst + delete when sensorChannel is null (MySQL unique constraint limitation)
    if (channelValue === null) {
      const existing = await prisma.temperatureAlert.findFirst({
        where: {
          deviceId,
          sensorChannel: null,
        },
      });

      if (existing) {
        await prisma.temperatureAlert.delete({
          where: { id: existing.id },
        });
      }
    } else {
      // Use unique constraint when sensorChannel is a string
      await prisma.temperatureAlert.delete({
        where: { 
          deviceId_sensorChannel: {
            deviceId,
            sensorChannel: channelValue,
          }
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/employee");
    revalidatePath(`/devices/${deviceId}`);

    return { success: true };
  } catch (error: any) {
    console.error("[Temperature Alert] Failed to delete alert:", error);
    return {
      success: false,
      error: error.message || "Failed to delete alert",
    };
  }
}

