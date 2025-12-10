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
 * Get device config/properties (includes real-time values like temperature)
 * GET {baseUrl}/device/openapi/v1/devices/{deviceId}/config
 */
export async function getMilesightDeviceConfig(
  baseUrl: string,
  accessToken: string,
  deviceId: string
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}/config`;

  console.log("[Milesight Devices] Getting device config:", deviceId);

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Get device config failed (${response.status}): ${responseText}`
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

  if (response.status === 405) {
    console.warn(
      "[Milesight Devices] PUT not supported, attempting POST fallback endpoint"
    );
    return attemptMilesightUpdateFallback(
      baseUrl,
      accessToken,
      deviceId,
      updateData
    );
  }

  if (!response.ok) {
    throw new Error(
      `Update device failed (${response.status}): ${responseText}`
    );
  }

  return responseText ? JSON.parse(responseText) : { success: true };
}

/**
 * Update device configuration / properties
 * PUT {baseUrl}/device/openapi/v1/devices/{deviceId}/config
 */
export async function updateMilesightDeviceConfig(
  baseUrl: string,
  accessToken: string,
  deviceId: string,
  properties: Record<string, any>
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}/config`;

  console.log("[Milesight Devices] Updating config:", deviceId, properties);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ properties }),
  });

  const responseText = await response.text();
  console.log("[Milesight Devices] Config update response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Update device config failed (${response.status}): ${responseText}`
    );
  }

  return responseText ? JSON.parse(responseText) : { success: true };
}

/**
 * Trigger a firmware update for a device
 * POST {baseUrl}/device/openapi/v1/devices/{deviceId}/firmware
 */
export async function updateMilesightDeviceFirmware(
  baseUrl: string,
  accessToken: string,
  deviceId: string,
  payload: {
    firmwareVersion: string;
    firmwareFileId?: string;
    releaseNotes?: string;
  }
): Promise<any> {
  const apiUrl = `${baseUrl}/device/openapi/v1/devices/${deviceId}/firmware`;

  console.log("[Milesight Devices] Triggering firmware update:", {
    deviceId,
    payload,
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("[Milesight Devices] Firmware update response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Firmware update failed (${response.status}): ${responseText}`
    );
  }

  return responseText ? JSON.parse(responseText) : { success: true };
}

/**
 * Reboot TS302 device via downlink command
 * Sends reboot command (ff10ff) through LoRaWAN downlink via UG65 gateway
 * POST {baseUrl}/device/openapi/v1/devices/{deviceId}/downlink
 * or POST {baseUrl}/lora/openapi/v1/devices/{deviceId}/downlink
 */
export async function rebootTS302Device(
  baseUrl: string,
  accessToken: string,
  deviceId: string,
  devEUI?: string | null
): Promise<any> {
  // TS302 reboot command: ff10ff
  // ff = reserved byte, 10 = reboot command type, ff = reserved byte
  const rebootCommand = "ff10ff";
  
  // Convert hex string to base64 for API
  const commandBytes = Buffer.from(rebootCommand, "hex");
  const commandBase64 = commandBytes.toString("base64");

  console.log("[Milesight Devices] Sending TS302 reboot command:", {
    deviceId,
    devEUI,
    command: rebootCommand,
    base64: commandBase64,
  });

  // Try multiple possible downlink endpoints and payload formats
  const endpointConfigs: Array<{ url: string; payload: any }> = [];

  // Try different endpoint patterns
  const baseEndpoints = [
    { path: `/data/openapi/v1/devices/${deviceId}/downlink`, useDevEUI: false },
    { path: `/lora/openapi/v1/devices/${deviceId}/downlink`, useDevEUI: false },
    { path: `/device/openapi/v1/devices/${deviceId}/downlink`, useDevEUI: false },
    { path: `/device/openapi/v1/devices/${deviceId}/commands`, useDevEUI: false },
  ];

  if (devEUI) {
    baseEndpoints.push({ path: `/lora/openapi/v1/devices/${devEUI}/downlink`, useDevEUI: true });
    baseEndpoints.push({ path: `/data/openapi/v1/devices/${devEUI}/downlink`, useDevEUI: true });
  }

  // Generate all combinations of endpoints and payload formats
  for (const endpoint of baseEndpoints) {
    const url = `${baseUrl}${endpoint.path}`;
    
    // Format 1: fPort + data (base64)
    endpointConfigs.push({
      url,
      payload: {
        fPort: 85,
        data: commandBase64,
        ...(endpoint.useDevEUI && devEUI ? { devEUI } : {}),
      },
    });

    // Format 2: fPort + payload (base64)
    endpointConfigs.push({
      url,
      payload: {
        fPort: 85,
        payload: commandBase64,
        ...(endpoint.useDevEUI && devEUI ? { devEUI } : {}),
      },
    });

    // Format 3: port + data (base64)
    endpointConfigs.push({
      url,
      payload: {
        port: 85,
        data: commandBase64,
        ...(endpoint.useDevEUI && devEUI ? { devEUI } : {}),
      },
    });

    // Format 4: fPort + data (hex string)
    endpointConfigs.push({
      url,
      payload: {
        fPort: 85,
        data: rebootCommand,
        encoding: "hex",
        ...(endpoint.useDevEUI && devEUI ? { devEUI } : {}),
      },
    });

    // Format 5: deviceId + fPort + data (for device endpoints)
    if (!endpoint.useDevEUI) {
      endpointConfigs.push({
        url,
        payload: {
          deviceId,
          fPort: 85,
          data: commandBase64,
        },
      });
    }
  }

  let lastError: Error | null = null;
  for (let i = 0; i < endpointConfigs.length; i++) {
    const { url: apiUrl, payload } = endpointConfigs[i];
    try {

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("[Milesight Devices] Downlink attempt:", {
        url: apiUrl,
        status: response.status,
        payload: JSON.stringify(payload),
        response: responseText,
      });

      if (response.ok) {
        console.log("[Milesight Devices] ✅ Reboot command sent successfully");
        return responseText ? JSON.parse(responseText) : { success: true };
      }

      // If 404, try next endpoint
      if (response.status === 404) {
        continue;
      }

      // If parameter error, the endpoint exists but format is wrong - try next format
      if (response.status === 400 && responseText.includes("parameter")) {
        continue;
      }

      // For other errors, save and try next
      lastError = new Error(
        `Reboot command failed (${response.status}): ${responseText}`
      );
    } catch (error: any) {
      lastError = error;
      // Continue to next endpoint unless it's the last one
      if (i === endpointConfigs.length - 1) {
        throw error;
      }
    }
  }

  // If all endpoints failed, throw informative error
  throw lastError || new Error("Reboot command failed: No supported downlink endpoint found. Ensure the device is a TS302 and has a valid DevEUI configured. The Milesight API may not support programmatic downlink commands, or the endpoint format may differ.");
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
  const rawStatus = device.connectStatus || device.status || device.onlineStatus || null;
  const deviceType = device.model || device.deviceType || device.type || null;
  
  // Normalize status to uppercase ONLINE/OFFLINE
  let status: string | null = null;
  if (rawStatus) {
    const normalized = String(rawStatus).toUpperCase().trim();
    // Handle various status formats from Milesight
    if (normalized === "ONLINE" || normalized === "1" || normalized === "TRUE" || normalized === "CONNECTED") {
      status = "ONLINE";
    } else if (normalized === "OFFLINE" || normalized === "0" || normalized === "FALSE" || normalized === "DISCONNECTED") {
      status = "OFFLINE";
    } else {
      // Preserve original if it's already a valid format
      status = normalized;
    }
  }
  
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

async function attemptMilesightUpdateFallback(
  baseUrl: string,
  accessToken: string,
  deviceId: string,
  updateData: {
    name?: string;
    description?: string;
    tag?: string;
  }
) {
  const fallbackUrl = `${baseUrl}/device/openapi/v1/devices/update`;
  const fallbackPayload = {
    deviceId,
    id: deviceId,
    ...updateData,
  };

  console.log("[Milesight Devices] Fallback update payload:", fallbackPayload);

  const fallbackResponse = await fetch(fallbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(fallbackPayload),
  });

  const fallbackText = await fallbackResponse.text();
  console.log(
    "[Milesight Devices] Fallback update response:",
    fallbackResponse.status,
    fallbackText
  );

  if (!fallbackResponse.ok) {
    throw new Error(
      `Update device failed via fallback (${fallbackResponse.status}): ${fallbackText}`
    );
  }

  return fallbackText ? JSON.parse(fallbackText) : { success: true };
}

