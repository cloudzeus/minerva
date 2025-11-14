import { prisma } from "@/lib/prisma";
import { requestMilesightToken } from "@/lib/milesight";
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
      : Number.POSITIVE_INFINITY;

    if (minutesSince >= HEARTBEAT_THRESHOLD_MINUTES) {
      await handleDeviceOffline(device, minutesSince);
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

export async function recordDeviceHeartbeat(
  deviceId: string,
  timestamp: number,
  source: "webhook" | "console"
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
  } else {
    updateData.lastConsoleSyncAt = new Date();
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
    `[DeviceMonitor] ⚠️ Device ${device.sn || device.deviceId} missed webhook data for ${minutesSince} minutes`
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
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.accessToken}`,
      },
      body: JSON.stringify({
        pageSize: CONSOLE_FETCH_LIMIT,
        pageNumber: 1,
        devEUI: device.devEUI,
        orders: [{ column: "ts", direction: "DESC" }],
      }),
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
  const eventExists = await prisma.milesightDeviceTelemetry.findFirst({
    where: { deviceId: device.deviceId, eventId },
  });

  if (eventExists) {
    return;
  }

  const temperature =
    typeof dataPayload.temperature === "number"
      ? dataPayload.temperature
      : typeof dataPayload.temperature_left === "number"
      ? dataPayload.temperature_left
      : typeof dataPayload.temperature_right === "number"
      ? dataPayload.temperature_right
      : null;

  const humidity =
    typeof dataPayload.humidity === "number" ? dataPayload.humidity : null;
  const battery =
    typeof dataPayload.battery === "number"
      ? Math.round(dataPayload.battery)
      : null;

  await prisma.milesightDeviceTelemetry.create({
    data: {
      deviceId: device.deviceId,
      eventId,
      eventType: row.eventType || row.type || "CONSOLE_BACKFILL",
      eventVersion: row.version?.toString() || null,
      dataTimestamp: BigInt(Math.floor(timestampValue)),
      dataType: row.dataType || "PROPERTY",
      payload: JSON.stringify(dataPayload),
      deviceSn: device.sn,
      deviceName: device.name,
      deviceModel: device.deviceType,
      deviceDevEUI: device.devEUI,
      temperature,
      humidity,
      battery,
      sensorData: JSON.stringify(dataPayload),
    },
  });

  await recordDeviceHeartbeat(device.deviceId, timestampValue, "console");

  console.log(
    `[DeviceMonitor] ✅ Stored console telemetry for ${device.deviceId} @ ${timestampValue}`
  );
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

