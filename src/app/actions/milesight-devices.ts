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
  updateMilesightDevice,
  deleteMilesightDevice,
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

