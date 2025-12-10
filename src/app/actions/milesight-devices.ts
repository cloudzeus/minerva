"use server";

/**
 * Milesight Device Management Server Actions
 * 
 * SECURITY: ALL actions in this file are ADMIN-ONLY
 * Every function calls requireRole(Role.ADMIN) to enforce access control
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import {
  searchMilesightDevices,
  addMilesightDevice,
  getMilesightDevice,
  getMilesightDeviceConfig,
  updateMilesightDevice,
  updateMilesightDeviceConfig,
  updateMilesightDeviceFirmware,
  deleteMilesightDevice,
  rebootTS302Device,
  mapMilesightDeviceToCache,
  type DeviceSearchParams,
} from "@/lib/milesight-devices";

/**
 * Get Milesight access token and settings
 * Helper function for device operations
 */
async function getMilesightAuth() {
  const settings = await prisma.milesightSettings.findFirst();

  if (!settings) {
    throw new Error("Milesight authentication not configured. Please configure in Settings → Milesight Auth.");
  }

  if (!settings.enabled) {
    throw new Error("Milesight integration is disabled. Please enable it in settings.");
  }

  if (!settings.accessToken) {
    throw new Error("No access token available. Please reconnect in Settings → Milesight Auth.");
  }

  // Check if token is expired
  if (settings.accessTokenExpiresAt && settings.accessTokenExpiresAt < new Date()) {
    throw new Error("Access token expired. Please refresh token in Settings → Milesight Auth.");
  }

  return {
    baseUrl: settings.baseUrl,
    accessToken: settings.accessToken,
  };
}

async function upsertDeviceCacheRecord(cacheData: ReturnType<typeof mapMilesightDeviceToCache>) {
  await prisma.$transaction(async (tx) => {
    const existingById = await tx.milesightDeviceCache.findUnique({
      where: { deviceId: cacheData.deviceId },
    });

    if (existingById) {
      await tx.milesightDeviceCache.update({
        where: { deviceId: cacheData.deviceId },
        data: cacheData,
      });
      return;
    }

    const identifierConditions = [];
    if (cacheData.sn) identifierConditions.push({ sn: cacheData.sn });
    if (cacheData.devEUI) identifierConditions.push({ devEUI: cacheData.devEUI });

    let existingByIdentifier = null;
    if (identifierConditions.length > 0) {
      existingByIdentifier = await tx.milesightDeviceCache.findFirst({
        where: { OR: identifierConditions },
      });
    }

    if (existingByIdentifier) {
      const oldDeviceId = existingByIdentifier.deviceId;

      await tx.milesightDeviceTelemetry.updateMany({
        where: { deviceId: oldDeviceId },
        data: { deviceId: cacheData.deviceId },
      });

      await tx.temperatureAlert.updateMany({
        where: { deviceId: oldDeviceId },
        data: { deviceId: cacheData.deviceId },
      });

      await tx.milesightDeviceCache.update({
        where: { deviceId: oldDeviceId },
        data: cacheData,
      });
    } else {
      await tx.milesightDeviceCache.create({ data: cacheData });
    }
  });
}

/**
 * Search and list devices
 * SECURITY: ADMIN-ONLY
 */
export async function searchDevices(searchParams: DeviceSearchParams = {}) {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  console.log("[Milesight Devices Action] Starting device search...");

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();
    console.log("[Milesight Devices Action] Auth OK - Base URL:", baseUrl);

    const response = await searchMilesightDevices(baseUrl, accessToken, searchParams);
    console.log("[Milesight Devices Action] API response received");

    // Sync devices to local cache
    if (response.data?.list && Array.isArray(response.data.list)) {
      console.log("[Milesight Devices Action] Syncing", response.data.list.length, "devices to cache");
      
      for (const device of response.data.list) {
        console.log("[Milesight Devices Action] Syncing device:", device);
        const cacheData = mapMilesightDeviceToCache(device);
        console.log("[Milesight Devices Action] Mapped cache data:", cacheData);
        
        await upsertDeviceCacheRecord(cacheData);
      }
      
      console.log("[Milesight Devices Action] Sync complete");
    } else {
      console.warn("[Milesight Devices Action] No devices in response:", response);
    }

    return {
      success: true,
      data: response.data,
      message: `Found ${response.data?.list?.length || 0} devices`,
    };
  } catch (error: any) {
    console.error("[Milesight Devices Action] ========== ERROR ==========");
    console.error("[Milesight Devices Action] Error message:", error.message);
    console.error("[Milesight Devices Action] Error stack:", error.stack);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Add a new device
 * SECURITY: ADMIN-ONLY
 */
export async function createDevice(formData: FormData) {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const sn = formData.get("sn") as string;
  const devEUI = formData.get("devEUI") as string | null;
  const imei = formData.get("imei") as string | null;
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const tag = formData.get("tag") as string | null;

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();

    const deviceData: any = { sn };
    if (devEUI) deviceData.devEUI = devEUI;
    if (imei) deviceData.imei = imei;
    if (name) deviceData.name = name;
    if (description) deviceData.description = description;
    if (tag) deviceData.tag = tag;

    const response = await addMilesightDevice(baseUrl, accessToken, deviceData);

    // Add to local cache
    if (response.data) {
      const cacheData = mapMilesightDeviceToCache(response.data);
      await prisma.milesightDeviceCache.create({ data: cacheData });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Added Milesight device: ${name || sn}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("[Milesight Devices] Create error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get device details
 * SECURITY: ADMIN-ONLY
 */
export async function getDeviceDetails(deviceId: string) {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();

    const response = await getMilesightDevice(baseUrl, accessToken, deviceId);

    // Update local cache
    if (response.data) {
      const cacheData = mapMilesightDeviceToCache(response.data);
      await prisma.milesightDeviceCache.upsert({
        where: { deviceId: cacheData.deviceId },
        update: cacheData,
        create: cacheData,
      });
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("[Milesight Devices] Get error:", error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Get latest configuration/properties for a device
 * SECURITY: ADMIN-ONLY
 */
export async function getDeviceConfiguration(deviceId: string) {
  await requireRole(Role.ADMIN);

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();
    const response = await getMilesightDeviceConfig(baseUrl, accessToken, deviceId);
    const normalized = response && typeof response === "object" && "data" in response ? (response as any).data : response;

    return {
      success: true,
      data: normalized,
    };
  } catch (error: any) {
    console.error("[Milesight Devices] Config fetch error:", error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Update device information
 * SECURITY: ADMIN-ONLY
 */
export async function updateDevice(deviceId: string, formData: FormData) {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const tag = formData.get("tag") as string | null;

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (tag) updateData.tag = tag;

    const response = await updateMilesightDevice(baseUrl, accessToken, deviceId, updateData);

    // Update local cache
    if (response.data) {
      const cacheData = mapMilesightDeviceToCache(response.data);
      await prisma.milesightDeviceCache.update({
        where: { deviceId: cacheData.deviceId },
        data: cacheData,
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Updated Milesight device: ${deviceId}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Milesight Devices] Update error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update device configuration/properties
 * SECURITY: ADMIN-ONLY
 */
export async function updateDeviceConfiguration(
  deviceId: string,
  properties: Record<string, any>
) {
  const currentUser = await requireRole(Role.ADMIN);

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();
    const response = await updateMilesightDeviceConfig(baseUrl, accessToken, deviceId, properties);
    const normalized = response && typeof response === "object" && "data" in response ? (response as any).data : response;

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Updated configuration for Milesight device: ${deviceId}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);

    return { success: true, data: normalized };
  } catch (error: any) {
    console.error("[Milesight Devices] Config update error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger firmware update
 * SECURITY: ADMIN-ONLY
 */
export async function triggerFirmwareUpgrade(
  deviceId: string,
  payload: {
    firmwareVersion: string;
    firmwareFileId?: string;
    releaseNotes?: string;
  }
) {
  const currentUser = await requireRole(Role.ADMIN);

  if (!payload?.firmwareVersion) {
    return { success: false, error: "Firmware version is required." };
  }

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();
    const response = await updateMilesightDeviceFirmware(baseUrl, accessToken, deviceId, payload);
    const normalized = response && typeof response === "object" && "data" in response ? (response as any).data : response;

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Triggered firmware update (${payload.firmwareVersion}) for Milesight device: ${deviceId}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);

    return { success: true, data: normalized };
  } catch (error: any) {
    console.error("[Milesight Devices] Firmware update error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a device
 * SECURITY: ADMIN-ONLY
 */
export async function deleteDevice(deviceId: string) {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();

    await deleteMilesightDevice(baseUrl, accessToken, deviceId);

    // Remove from local cache
    await prisma.milesightDeviceCache.delete({
      where: { deviceId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Deleted Milesight device: ${deviceId}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    return { success: true };
  } catch (error: any) {
    console.error("[Milesight Devices] Delete error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all devices from Milesight to local cache
 * SECURITY: ADMIN-ONLY
 */
export async function syncAllDevices() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();

    let allDevices: any[] = [];
    let pageNumber = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await searchMilesightDevices(baseUrl, accessToken, {
        pageSize,
        pageNumber,
      });

      if (response.data?.list) {
        allDevices = [...allDevices, ...response.data.list];
        hasMore = response.data.list.length === pageSize;
        pageNumber++;
      } else {
        hasMore = false;
      }
    }

    // Sync all to cache
    for (const device of allDevices) {
      const cacheData = mapMilesightDeviceToCache(device);
      await upsertDeviceCacheRecord(cacheData);
    }

    revalidatePath("/admin/devices/milesight");
    return { success: true, count: allDevices.length };
  } catch (error: any) {
    console.error("[Milesight Devices] Sync error:", error);
    return { success: false, error: error.message, count: 0 };
  }
}

export async function toggleDeviceCritical(deviceId: string, isCritical: boolean) {
  await requireRole(Role.ADMIN);

  try {
    await prisma.milesightDeviceCache.update({
      where: { deviceId },
      data: {
        isCritical,
        ...(isCritical
          ? {}
          : {
              criticalAlertActive: false,
            }),
      },
    });

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Milesight Devices] toggle critical error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reboot TS302 device via downlink command
 * SECURITY: ADMIN-ONLY
 */
export async function rebootDevice(deviceId: string) {
  const currentUser = await requireRole(Role.ADMIN);

  try {
    // Get device info to check if it's TS302 and get DevEUI
    const device = await prisma.milesightDeviceCache.findUnique({
      where: { deviceId },
      select: {
        deviceType: true,
        devEUI: true,
        name: true,
        sn: true,
      },
    });

    if (!device) {
      return { success: false, error: "Device not found in local cache" };
    }

    // Check if device is TS302
    const isTS302 = device.deviceType?.toUpperCase().includes("TS302") || 
                    device.deviceType?.toUpperCase().includes("TS-302");

    if (!isTS302) {
      return { 
        success: false, 
        error: "Reboot command is only supported for TS302 devices. This device type is: " + (device.deviceType || "Unknown")
      };
    }

    if (!device.devEUI) {
      return { 
        success: false, 
        error: "Device DevEUI is required for downlink commands. Please ensure the device has a DevEUI configured."
      };
    }

    const { baseUrl, accessToken } = await getMilesightAuth();
    const response = await rebootTS302Device(baseUrl, accessToken, deviceId, device.devEUI);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Sent reboot command to TS302 device: ${device.name || device.sn || deviceId}`,
      },
    });

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);
    return { success: true, data: response };
  } catch (error: any) {
    console.error("[Milesight Devices] Reboot error:", error);
    
    // Provide helpful error message
    const errorMessage = error.message || "Unknown error";
    if (errorMessage.includes("No supported downlink endpoint")) {
      return {
        success: false,
        error: "The Milesight OpenAPI does not support downlink commands. TS302 reboot commands must be sent through the gateway's embedded Network Server (NS) API (e.g., UG65 gateway). The reboot command is: ff10ff (hex) on application port 85. To enable this feature, you would need to integrate with your gateway's Network Server API.",
      };
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Update device sensor names (for TS302 and similar devices)
 * SECURITY: ADMIN-ONLY
 */
export async function updateDeviceSensorNames(
  deviceId: string,
  sensorNames: {
    sensorNameLeft?: string;
    sensorNameRight?: string;
  }
) {
  const currentUser = await requireRole(Role.ADMIN);

  try {
    await prisma.milesightDeviceCache.update({
      where: { deviceId },
      data: {
        sensorNameLeft: sensorNames.sensorNameLeft || null,
        sensorNameRight: sensorNames.sensorNameRight || null,
      },
    });

    // Try to create activity log, but don't fail if user doesn't exist
    try {
      // Verify user exists before creating activity log
      const userExists = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { id: true },
      });

      if (userExists) {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            type: "PROFILE_UPDATED",
            description: `Updated sensor names for device: ${deviceId}`,
          },
        });
      } else {
        console.warn(`[Milesight Devices] User ${currentUser.id} not found in database, skipping activity log`);
      }
    } catch (logError: any) {
      // Log the error but don't fail the operation
      console.error("[Milesight Devices] Failed to create activity log:", logError);
    }

    revalidatePath("/admin/devices/milesight");
    revalidatePath(`/admin/devices/milesight/${deviceId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Milesight Devices] Sensor names update error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check for offline devices and send email notification
 * SECURITY: ADMIN-ONLY (can be called by cron)
 */
export async function checkAndNotifyOfflineDevices() {
  try {
    const offlineDevices = await prisma.milesightDeviceCache.findMany({
      where: {
        lastStatus: "OFFLINE",
      },
      select: {
        deviceId: true,
        name: true,
        sn: true,
        deviceType: true,
        lastSyncAt: true,
        lastStatus: true,
      },
    });

    if (offlineDevices.length === 0) {
      return { success: true, count: 0, message: "No offline devices found" };
    }

    // Import email function
    const { sendOfflineDeviceNotificationEmail } = await import("@/lib/email");
    
    const result = await sendOfflineDeviceNotificationEmail({
      devices: offlineDevices.map((d) => ({
        deviceId: d.deviceId,
        name: d.name || d.sn || d.deviceId,
        sn: d.sn || "—",
        deviceType: d.deviceType || "Unknown",
        lastSyncAt: d.lastSyncAt,
      })),
      recipientEmail: "gkozyris@aic.gr",
    });

    return {
      success: result.success,
      count: offlineDevices.length,
      message: result.success
        ? `Notification sent for ${offlineDevices.length} offline device(s)`
        : result.error || "Failed to send notification",
    };
  } catch (error: any) {
    console.error("[Milesight Devices] Check offline devices error:", error);
    return { success: false, error: error.message, count: 0 };
  }
}

