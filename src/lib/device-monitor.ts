import { prisma } from "@/lib/prisma";
import { requestMilesightToken } from "@/lib/milesight";
import { getMilesightDeviceConfig } from "@/lib/milesight-devices";
import {
  sendDeviceOfflineAlertEmail,
  sendDeviceRecoveryEmail,
} from "@/lib/email";

const HEARTBEAT_THRESHOLD_MINUTES = 30;
const ALERT_RECIPIENTS = ["gkozyris@aic.gr"];
const CONSOLE_FETCH_LIMIT = 20;
const DEFAULT_CRITICAL_SERIALS = [
  "6723D38465150013",
  "6723D38552440017",
];
const DEFAULT_CRITICAL_DEVEUIS = [
  "24E124723D384651",
  "24E124723D385524",
];

export async function monitorCriticalDevices() {
  console.log("=".repeat(80));
  console.log("[DeviceMonitor] Checking critical devices...");
  console.log("[DeviceMonitor] Time:", new Date().toISOString());
  console.log("=".repeat(80));

  await prisma.milesightDeviceCache.updateMany({
    where: { sn: { in: DEFAULT_CRITICAL_SERIALS } },
    data: { isCritical: true },
  });
  await prisma.milesightDeviceCache.updateMany({
    where: { devEUI: { in: DEFAULT_CRITICAL_DEVEUIS } },
    data: { isCritical: true },
  });

  const criticalDevices = await prisma.milesightDeviceCache.findMany({
    where: { isCritical: true },
    select: {
      deviceId: true,
      name: true,
      sn: true,
      devEUI: true,
      lastWebhookAt: true,
      criticalAlertActive: true,
      lastCriticalAlertAt: true,
    },
  });

  if (criticalDevices.length === 0) {
    console.log("[DeviceMonitor] No devices flagged as critical.");
    return;
  }

  const now = Date.now();

  for (const device of criticalDevices) {
    const lastWebhook = device.lastWebhookAt
      ? device.lastWebhookAt.getTime()
      : 0;
    const minutesSince = lastWebhook
      ? Math.floor((now - lastWebhook) / (1000 * 60))
      : null;

    if (minutesSince === null || minutesSince >= HEARTBEAT_THRESHOLD_MINUTES) {
      await handleDeviceOffline(device, minutesSince ?? HEARTBEAT_THRESHOLD_MINUTES);
    } else if (device.criticalAlertActive) {
      await handleDeviceRecovered(device);
    } else {
      console.log(
        `[DeviceMonitor] ✅ ${device.sn || device.deviceId} heartbeat OK (${minutesSince} minute(s) since last webhook)`
      );
    }
  }
}

export async function backfillCriticalDevices() {
  console.log("=".repeat(80));
  console.log("[DeviceMonitor] Running console backfill for critical devices...");
  console.log("[DeviceMonitor] Time:", new Date().toISOString());
  console.log("=".repeat(80));

  const devicesNeedingBackfill = await prisma.milesightDeviceCache.findMany({
    where: { isCritical: true, criticalAlertActive: true },
    select: {
      deviceId: true,
      sn: true,
      devEUI: true,
      name: true,
      deviceType: true,
    },
  });

  if (devicesNeedingBackfill.length === 0) {
    console.log("[DeviceMonitor] No devices require backfill.");
    return;
  }

  for (const device of devicesNeedingBackfill) {
    await backfillTelemetryFromConsole(device);
  }
}

export async function pollCriticalDeviceConfigs() {
  console.log("=".repeat(80));
  console.log("[DeviceMonitor] Polling Milesight config for critical devices...");
  console.log("[DeviceMonitor] Time:", new Date().toISOString());
  console.log("=".repeat(80));

  const settings = await getLatestMilesightSettings();

  if (!settings) {
    console.warn("[DeviceMonitor] ⚠️ Cannot poll configs without Milesight settings");
    return;
  }

  if (!settings.accessToken) {
    console.warn("[DeviceMonitor] ⚠️ No Milesight access token available for config poll");
    return;
  }

  const criticalDevices = await prisma.milesightDeviceCache.findMany({
    where: { isCritical: true },
    select: {
      deviceId: true,
      sn: true,
      devEUI: true,
      name: true,
      deviceType: true,
    },
  });

  if (criticalDevices.length === 0) {
    console.log("[DeviceMonitor] No critical devices to poll.");
    return;
  }

  for (const device of criticalDevices) {
    try {
      const response = await getMilesightDeviceConfig(
        settings.baseUrl,
        settings.accessToken,
        device.deviceId
      );

      const configData = response?.data || response;
      const properties = configData?.properties || {};

      if (Object.keys(properties).length === 0) {
        console.log(
          `[DeviceMonitor] ⚠️ No config properties returned for ${device.deviceId}`
        );
        continue;
      }

      await saveTelemetrySnapshot(device.deviceId, properties, {
        timestamp: configData?.timestamp ?? Date.now(),
        eventType: "CONFIG_POLL",
        source: "config",
        deviceContext: device,
      });
    } catch (error: any) {
      console.error(
        `[DeviceMonitor] ❌ Config poll failed for ${device.deviceId}:`,
        error?.message || error
      );
    }
  }
}

export async function recordDeviceHeartbeat(
  deviceId: string,
  timestamp: number,
  source: "webhook" | "console" | "config"
) {
  const device = await prisma.milesightDeviceCache.findUnique({
    where: { deviceId },
  });

  if (!device) {
    return;
  }

  const updateData: any = {
    lastHeartbeatAt: new Date(timestamp),
  };

  if (source === "webhook") {
    updateData.lastWebhookAt = new Date(timestamp);
    if (device.criticalAlertActive) {
      updateData.criticalAlertActive = false;
    }
  } else if (source === "console") {
    updateData.lastConsoleSyncAt = new Date();
  } else if (source === "config") {
    updateData.lastHeartbeatAt = new Date(timestamp);
  }

  await prisma.milesightDeviceCache.update({
    where: { deviceId },
    data: updateData,
  });

  if (source === "webhook" && device.criticalAlertActive && device.isCritical) {
    await sendDeviceRecoveryEmail({
      deviceName: device.name || device.deviceId,
      serialNumber: device.sn,
      devEui: device.devEUI,
      recipients: ALERT_RECIPIENTS,
    });

    console.log(
      `[DeviceMonitor] ✅ Device ${device.deviceId} recovered via webhook`
    );
  }
}

async function handleDeviceOffline(
  device: {
    deviceId: string;
    name: string | null;
    sn: string | null;
    devEUI: string | null;
    criticalAlertActive: boolean;
  },
  minutesSince: number
) {
  console.warn(
    `[DeviceMonitor] ⚠️ Device ${device.sn || device.deviceId} missed webhook data for ${
      minutesSince ?? "more than " + HEARTBEAT_THRESHOLD_MINUTES
    } minutes`
  );

  if (!device.criticalAlertActive) {
    await sendDeviceOfflineAlertEmail({
      deviceName: device.name || device.deviceId,
      serialNumber: device.sn,
      devEui: device.devEUI,
      minutesSinceLast: minutesSince,
      recipients: ALERT_RECIPIENTS,
    });

    await prisma.milesightDeviceCache.update({
      where: { deviceId: device.deviceId },
      data: {
        criticalAlertActive: true,
        lastCriticalAlertAt: new Date(),
      },
    });
  }
}

async function handleDeviceRecovered(device: {
  deviceId: string;
  name: string | null;
  sn: string | null;
  devEUI: string | null;
}) {
  await prisma.milesightDeviceCache.update({
    where: { deviceId: device.deviceId },
    data: {
      criticalAlertActive: false,
    },
  });

  await sendDeviceRecoveryEmail({
    deviceName: device.name || device.deviceId,
    serialNumber: device.sn,
    devEui: device.devEUI,
    recipients: ALERT_RECIPIENTS,
  });

  console.log(
    `[DeviceMonitor] ✅ Device ${device.sn || device.deviceId} telemetry resumed`
  );
}

async function backfillTelemetryFromConsole(device: {
  deviceId: string;
  sn: string | null;
  devEUI: string | null;
  name: string | null;
  deviceType: string | null;
}) {
  if (!device.devEUI) {
    console.warn(
      "[DeviceMonitor] ⚠️ Cannot backfill device without DevEUI:",
      device.deviceId
    );
    return;
  }

  const settings = await getLatestMilesightSettings();
  if (!settings) {
    console.warn("[DeviceMonitor] ⚠️ Milesight settings unavailable");
    return;
  }

  const apiUrl = `${settings.baseUrl.replace(
    /\/$/,
    ""
  )}/data/openapi/v1/logs/search`;

  try {
    const requestBody: Record<string, any> = {
      pageSize: CONSOLE_FETCH_LIMIT,
      pageNumber: 1,
      orders: [{ column: "ts", direction: "DESC" }],
    };

    if (device.devEUI) {
      requestBody.devEUIs = [device.devEUI];
    }
    if (device.deviceId) {
      requestBody.deviceIds = [device.deviceId];
    }
    if (device.sn) {
      requestBody.sns = [device.sn];
    }

    console.log("[DeviceMonitor] Fetching console telemetry:", {
      apiUrl,
      requestBody,
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(
        "[DeviceMonitor] ❌ Console fetch failed:",
        response.status,
        await response.text()
      );
      return;
    }

    const payload = await response.json();
    const rows =
      payload?.data?.content ||
      payload?.data?.list ||
      payload?.content ||
      payload?.list ||
      [];

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("[DeviceMonitor] ⚠️ No console rows returned");
      return;
    }

    for (const row of rows) {
      await storeTelemetryRow(device, row);
    }

    await prisma.milesightDeviceCache.update({
      where: { deviceId: device.deviceId },
      data: {
        lastConsoleSyncAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("[DeviceMonitor] ❌ Console fetch error:", error);
  }
}

export async function saveTelemetrySnapshot(
  deviceId: string,
  payload: Record<string, any>,
  options: {
    timestamp?: number;
    eventType?: string;
    eventId?: string;
    source?: "webhook" | "console" | "config" | string;
    deviceContext?: {
      deviceId: string;
      sn: string | null;
      devEUI: string | null;
      name: string | null;
      deviceType: string | null;
    };
  } = {}
) {
  const timestamp = options.timestamp ?? Date.now();
  const eventType = options.eventType || "CONFIG_SNAPSHOT";
  const eventId =
    options.eventId || `${eventType}-${deviceId}-${Math.floor(timestamp)}`;

  const device =
    options.deviceContext ||
    (await prisma.milesightDeviceCache.findUnique({
      where: { deviceId },
    }));

  if (!device) {
    console.warn("[Telemetry] Device not found for snapshot:", deviceId);
    return;
  }

  const existing = await prisma.milesightDeviceTelemetry.findFirst({
    where: { deviceId, eventId },
  });

  if (existing) {
    return;
  }

  const temperature =
    typeof payload.temperature === "number"
      ? payload.temperature
      : typeof payload.temperature_left === "number"
      ? payload.temperature_left
      : typeof payload.temperature_right === "number"
      ? payload.temperature_right
      : null;

  const humidity =
    typeof payload.humidity === "number" ? payload.humidity : null;
  const battery =
    typeof payload.battery === "number"
      ? Math.round(payload.battery)
      : typeof payload.battery_level === "number"
      ? Math.round(payload.battery_level)
      : null;

  const payloadString = JSON.stringify(payload);

  await prisma.milesightDeviceTelemetry.create({
    data: {
      deviceId,
      eventId,
      eventType,
      eventVersion: null,
      dataTimestamp: BigInt(Math.floor(timestamp)),
      dataType: "PROPERTY",
      payload: payloadString,
      deviceSn: device.sn,
      deviceName: device.name,
      deviceModel: device.deviceType,
      deviceDevEUI: device.devEUI,
      temperature,
      humidity,
      battery,
      sensorData: payloadString,
    },
  });

  await recordDeviceHeartbeat(
    deviceId,
    timestamp,
    (options.source as "webhook" | "console" | "config") || "config"
  );

  console.log(
    `[Telemetry] ✅ Snapshot stored for device ${deviceId} @ ${timestamp}`
  );
}

async function storeTelemetryRow(
  device: {
    deviceId: string;
    sn: string | null;
    devEUI: string | null;
    name: string | null;
    deviceType: string | null;
  },
  row: any
) {
  const timestampValue =
    typeof row.ts === "number"
      ? row.ts
      : row.timestamp
      ? Number(row.timestamp)
      : row.createdAt
      ? Date.parse(row.createdAt)
      : null;

  if (!timestampValue || Number.isNaN(timestampValue)) {
    return;
  }

  const dataPayload =
    row.data || row.payload || row.properties || row.content || {};
  const eventId =
    row.id?.toString() || row.eventId || `${device.deviceId}-${timestampValue}`;

  await saveTelemetrySnapshot(device.deviceId, dataPayload, {
    timestamp: timestampValue,
    eventType: row.eventType || row.type || "CONSOLE_BACKFILL",
    eventId,
    source: "console",
    deviceContext: device,
  });
}

async function getLatestMilesightSettings() {
  const settings = await prisma.milesightSettings.findFirst({
    where: { enabled: true },
    orderBy: { createdAt: "desc" },
  });

  if (!settings) {
    return null;
  }

  if (
    !settings.accessToken ||
    !settings.accessTokenExpiresAt ||
    settings.accessTokenExpiresAt.getTime() - Date.now() < 60 * 1000
  ) {
    try {
      const tokenResponse = await requestMilesightToken({
        baseUrl: settings.baseUrl,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
      });

      const newExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      return await prisma.milesightSettings.update({
        where: { id: settings.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || settings.refreshToken,
          accessTokenExpiresAt: newExpiresAt,
        },
      });
    } catch (error: any) {
      console.error("[DeviceMonitor] ❌ Failed to refresh token:", error);
      return settings.accessToken ? settings : null;
    }
  }

  return settings;
}

