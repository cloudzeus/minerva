"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface TemperatureAlertSettings {
  deviceId: string;
  sensorChannel?: string | null; // "CH1", "CH2", or null for single sensor
  minTemperature: number;
  maxTemperature: number;
  emailRecipients: string[];
  enabled: boolean;
  alertCooldown?: number;
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
    // Validate email recipients
    const emails = settings.emailRecipients.filter(
      (email) => email.trim() !== "" && email.includes("@")
    );

    if (emails.length === 0) {
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
        alert = await prisma.temperatureAlert.update({
          where: { id: existing.id },
          data: {
            minTemperature: settings.minTemperature,
            maxTemperature: settings.maxTemperature,
            emailRecipients: JSON.stringify(emails),
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
            emailRecipients: JSON.stringify(emails),
            enabled: settings.enabled,
            alertCooldown: settings.alertCooldown || 300,
          },
        });
      }
    } else {
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
          emailRecipients: JSON.stringify(emails),
          enabled: settings.enabled,
          alertCooldown: settings.alertCooldown || 300,
        },
        update: {
          minTemperature: settings.minTemperature,
          maxTemperature: settings.maxTemperature,
          emailRecipients: JSON.stringify(emails),
          enabled: settings.enabled,
          alertCooldown: settings.alertCooldown || 300,
        },
      });
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

