"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface TemperatureAlertSettings {
  deviceId: string;
  minTemperature: number;
  maxTemperature: number;
  emailRecipients: string[];
  enabled: boolean;
  alertCooldown?: number;
}

/**
 * Get temperature alert settings for a device
 */
export async function getTemperatureAlert(deviceId: string) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    const alert = await prisma.temperatureAlert.findUnique({
      where: { deviceId },
    });

    if (!alert) {
      return null;
    }

    return {
      ...alert,
      emailRecipients: JSON.parse(alert.emailRecipients),
    };
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

    const alert = await prisma.temperatureAlert.upsert({
      where: { deviceId: settings.deviceId },
      create: {
        deviceId: settings.deviceId,
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
export async function deleteTemperatureAlert(deviceId: string) {
  await requireRole([Role.ADMIN, Role.MANAGER]);

  try {
    await prisma.temperatureAlert.delete({
      where: { deviceId },
    });

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

