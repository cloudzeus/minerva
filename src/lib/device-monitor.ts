import { prisma } from "@/lib/prisma";
import { requestMilesightToken } from "@/lib/milesight";
import { sendDeviceOfflineAlertEmail } from "@/lib/email";

const CRITICAL_DEVICES = [
  {
    label: "Critical Sensor 1",
    serialNumber: "6723D38465150013",
    devEui: "24E124723D384651",
  },
  {
    label: "Critical Sensor 2",
    serialNumber: "6723D38552440017",
    devEui: "24E124723D385524",
  },
];

const OFFLINE_THRESHOLD_MINUTES = 10;
const ALERT_RECIPIENTS = ["gkozyris@aic.gr"];

export async function monitorCriticalDevices() {
  console.log("=".repeat(80));
  console.log("[DeviceMonitor] Checking critical devices...");
  console.log("[DeviceMonitor] Time:", new Date().toISOString());
  console.log("=".repeat(80));

  for (const deviceConfig of CRITICAL_DEVICES) {
    try {
      await checkCriticalDevice(deviceConfig);
    } catch (error: any) {
      console.error(
        `[DeviceMonitor] ❌ Error while checking device ${deviceConfig.serialNumber}:`,
        error
      );
    }
  }
}

async function checkCriticalDevice(deviceConfig: {
  label: string;
  serialNumber: string;
  devEui: string;
}) {
  const device = await prisma.milesightDeviceCache.findFirst({
    where: {
      OR: [
        { sn: deviceConfig.serialNumber },
        { devEUI: deviceConfig.devEui },
      ],
    },
  });

  if (!device) {
    console.warn(
      "[DeviceMonitor] ⚠️ Device not found in cache:",
      deviceConfig.serialNumber
    );
    return;
  }

  const latestTelemetry = await prisma.milesightDeviceTelemetry.findFirst({
    where: { deviceId: device.deviceId },
    orderBy: { dataTimestamp: "desc" },
  });

  const now = Date.now();
  const latestTimestamp = latestTelemetry
    ? Number(latestTelemetry.dataTimestamp)
    : 0;
  const minutesSinceLast = latestTimestamp
    ? Math.floor((now - latestTimestamp) / (1000 * 60))
    : Number.POSITIVE_INFINITY;

  if (minutesSinceLast >= OFFLINE_THRESHOLD_MINUTES) {
    console.warn(
      `[DeviceMonitor] ⚠️ Device ${deviceConfig.serialNumber} has no telemetry for ${minutesSinceLast} minutes`
    );

    await sendDeviceOfflineAlertEmail({
      deviceName: device.name || deviceConfig.label,
      serialNumber: device.sn || deviceConfig.serialNumber,
      devEui: device.devEUI || deviceConfig.devEui,
      minutesSinceLast,
      recipients: ALERT_RECIPIENTS,
    });

    await backfillTelemetryFromConsole(device, deviceConfig);
  } else {
    console.log(
      `[DeviceMonitor] ✅ Device ${deviceConfig.serialNumber} is healthy (last telemetry ${minutesSinceLast} minute(s) ago)`
    );
  }
}

async function backfillTelemetryFromConsole(
  device: {
    deviceId: string;
    sn: string | null;
    devEUI: string | null;
    name: string | null;
    deviceType: string | null;
  },
  deviceConfig: { serialNumber: string; devEui: string }
) {
  const settings = await getLatestMilesightSettings();

  if (!settings) {
    console.warn("[DeviceMonitor] ⚠️ Milesight settings not configured");
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
        pageSize: 20,
        pageNumber: 1,
        devEUI: deviceConfig.devEui,
        orders: [{ column: "ts", direction: "DESC" }],
      }),
    });

    if (!response.ok) {
      console.error(
        "[DeviceMonitor] ❌ Failed to fetch telemetry from console:",
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
      console.log("[DeviceMonitor] ⚠️ No telemetry rows returned from console");
      return;
    }

    for (const row of rows) {
      await storeTelemetryRow(device, row);
    }
  } catch (error: any) {
    console.error("[DeviceMonitor] ❌ Error fetching telemetry:", error);
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
      eventType: row.eventType || row.type || "DEVICE_DATA",
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

  console.log(
    `[DeviceMonitor] ✅ Stored telemetry row for device ${device.deviceId} @ ${timestampValue}`
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

      const updated = await prisma.milesightSettings.update({
        where: { id: settings.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || settings.refreshToken,
          accessTokenExpiresAt: newExpiresAt,
        },
      });

      return updated;
    } catch (error: any) {
      console.error("[DeviceMonitor] ❌ Failed to refresh Milesight token:", error);
      return settings.accessToken ? settings : null;
    }
  }

  return settings;
}

