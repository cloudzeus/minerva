/**
 * Milesight Device Management API
 * 
 * Provides functions to interact with Milesight Development Platform Device APIs:
 * - Search/List devices
 * - Add device
 * - Get device details
 * - Update device
 * - Delete device
 */

export interface MilesightDevice {
  id: string;
  sn?: string;
  devEUI?: string;
  imei?: string;
  name?: string;
  description?: string;
  tag?: string;
  status?: string;
  deviceType?: string;
  [key: string]: any; // Allow additional fields from API
}

export interface DeviceSearchParams {
  pageSize?: number;
  pageNumber?: number;
  sn?: string;
  devEUI?: string;
  imei?: string;
  name?: string;
}

export interface DeviceSearchResponse {
  data: {
    list: MilesightDevice[];
    total: number;
    pageNumber: number;
    pageSize: number;
  };
  status: string;
}

/**
 * Search/List devices from Milesight
 * POST {baseUrl}/device/openapi/v1/devices/search
 */
export async function searchMilesightDevices(
  baseUrl: string,
  accessToken: string,
  params: DeviceSearchParams = {}
): Promise<DeviceSearchResponse> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/search`;

  const requestBody = {
    pageSize: params.pageSize || 20,
    pageNumber: params.pageNumber || 1,
    ...(params.sn && { sn: params.sn }),
    ...(params.devEUI && { devEUI: params.devEUI }),
    ...(params.imei && { imei: params.imei }),
    ...(params.name && { name: params.name }),
  };

  console.log("[Milesight Devices] ========== SEARCH REQUEST ==========");
  console.log("[Milesight Devices] URL:", apiUrl);
  console.log("[Milesight Devices] Token (first 20 chars):", accessToken.substring(0, 20) + "...");
  console.log("[Milesight Devices] Request body:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("[Milesight Devices] Response status:", response.status);
    console.log("[Milesight Devices] Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("[Milesight Devices] Response body:", responseText);

    if (!response.ok) {
      throw new Error(
        `Device search failed (${response.status}): ${responseText}`
      );
    }

    const parsed = JSON.parse(responseText);
    console.log("[Milesight Devices] Parsed response:", JSON.stringify(parsed, null, 2));
    console.log("[Milesight Devices] ========== SEARCH COMPLETE ==========");

    // Handle Milesight response format (uses "content" instead of "list")
    if (parsed.data) {
      // Milesight uses "content" array, map it to "list" for consistency
      const deviceList = parsed.data.content || parsed.data.list || [];
      
      console.log("[Milesight Devices] Found", deviceList.length, "devices");
      
      return {
        data: {
          list: deviceList,
          total: parsed.data.total || deviceList.length,
          pageNumber: parsed.data.pageNumber || 1,
          pageSize: parsed.data.pageSize || 20,
        },
        status: parsed.status || "Success",
      };
    } else if (parsed.content || parsed.list || Array.isArray(parsed)) {
      // Direct array format
      const deviceList = parsed.content || parsed.list || parsed;
      return {
        data: {
          list: deviceList,
          total: parsed.total || deviceList.length,
          pageNumber: parsed.pageNumber || 1,
          pageSize: parsed.pageSize || 20,
        },
        status: "Success",
      };
    } else {
      console.warn("[Milesight Devices] Unexpected response format:", parsed);
      return {
        data: {
          list: [],
          total: 0,
          pageNumber: 1,
          pageSize: 20,
        },
        status: parsed.status || "Unknown",
      };
    }
  } catch (error: any) {
    console.error("[Milesight Devices] ========== SEARCH FAILED ==========");
    console.error("[Milesight Devices] Error:", error.message);
    console.error("[Milesight Devices] Stack:", error.stack);
    throw error;
  }
}

/**
 * Add a new device to Milesight
 * POST {baseUrl}/device/openapi/v1/devices
 */
export async function addMilesightDevice(
  baseUrl: string,
  accessToken: string,
  deviceData: {
    sn: string;
    devEUI?: string;
    imei?: string;
    name?: string;
    description?: string;
    tag?: string;
  }
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices`;

  console.log("[Milesight Devices] Adding device:", deviceData);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(deviceData),
  });

  const responseText = await response.text();
  console.log("[Milesight Devices] Add response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Add device failed (${response.status}): ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

/**
 * Get specific device details
 * GET {baseUrl}/device/openapi/v1/devices/{deviceId}
 */
export async function getMilesightDevice(
  baseUrl: string,
  accessToken: string,
  deviceId: string
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}`;

  console.log("[Milesight Devices] Getting device:", deviceId);

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Get device failed (${response.status}): ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

/**
 * Update device information
 * PUT {baseUrl}/device/openapi/v1/devices/{deviceId}
 */
export async function updateMilesightDevice(
  baseUrl: string,
  accessToken: string,
  deviceId: string,
  updateData: {
    name?: string;
    description?: string;
    tag?: string;
  }
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}`;

  console.log("[Milesight Devices] Updating device:", deviceId, updateData);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updateData),
  });

  const responseText = await response.text();
  console.log("[Milesight Devices] Update response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Update device failed (${response.status}): ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

/**
 * Delete a device
 * DELETE {baseUrl}/device/openapi/v1/devices/{deviceId}
 */
export async function deleteMilesightDevice(
  baseUrl: string,
  accessToken: string,
  deviceId: string
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}`;

  console.log("[Milesight Devices] Deleting device:", deviceId);

  const response = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text();
  console.log("[Milesight Devices] Delete response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Delete device failed (${response.status}): ${responseText}`
    );
  }

  // DELETE might return empty response
  return responseText ? JSON.parse(responseText) : { success: true };
}

/**
 * Helper to sync device to local cache
 * Maps Milesight API response to our cache schema
 */
export function mapMilesightDeviceToCache(device: any) {
  // Milesight uses different field names than expected
  const deviceId = device.deviceId || device.id;
  const status = device.connectStatus || device.status || device.onlineStatus || null;
  const deviceType = device.model || device.deviceType || device.type || null;
  
  // Handle tag - it can be array or string
  let tag = null;
  if (device.tag) {
    if (Array.isArray(device.tag) && device.tag.length > 0) {
      tag = device.tag.join(", ");
    } else if (typeof device.tag === "string") {
      tag = device.tag;
    }
  }

  console.log("[Milesight Devices] Mapping device:", {
    input: device,
    output: { deviceId, sn: device.sn, status, deviceType }
  });

  return {
    deviceId,
    sn: device.sn || null,
    devEUI: device.devEUI || null,
    imei: device.imei || null,
    name: device.name || null,
    description: device.description || null,
    tag,
    lastStatus: status,
    deviceType,
    lastSyncAt: new Date(),
  };
}

