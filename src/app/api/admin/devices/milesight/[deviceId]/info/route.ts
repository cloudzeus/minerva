"use server";

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getMilesightDevice, getMilesightDeviceConfig } from "@/lib/milesight-devices";
import { saveTelemetrySnapshot } from "@/lib/device-monitor";

async function getMilesightAuth() {
  const settings = await prisma.milesightSettings.findFirst({
    where: { enabled: true },
  });

  if (!settings) {
    throw new Error(
      "Milesight authentication is not configured. Please configure it in Settings → Milesight Auth."
    );
  }

  if (!settings.accessToken) {
    throw new Error(
      "No Milesight access token available. Please reconnect in Settings → Milesight Auth."
    );
  }

  if (
    settings.accessTokenExpiresAt &&
    settings.accessTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new Error(
      "Milesight access token has expired. Please refresh the token in Settings → Milesight Auth."
    );
  }

  return {
    baseUrl: settings.baseUrl,
    accessToken: settings.accessToken,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  await requireRole(Role.ADMIN);

  const { deviceId } = await context.params;

  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: "Missing deviceId parameter" },
      { status: 400 }
    );
  }

  try {
    const { baseUrl, accessToken } = await getMilesightAuth();
    const [deviceResponse, configResponse] = await Promise.allSettled([
      getMilesightDevice(baseUrl, accessToken, deviceId),
      getMilesightDeviceConfig(baseUrl, accessToken, deviceId),
    ]);

    const deviceData =
      deviceResponse.status === "fulfilled" ? deviceResponse.value?.data ?? deviceResponse.value : null;
    const configData =
      configResponse.status === "fulfilled" ? configResponse.value?.data ?? configResponse.value : null;

    const properties = configData?.properties || {};

    const temperatureLeft = Number(properties.temperature_left);
    const temperatureRight = Number(properties.temperature_right);
    const battery =
      typeof properties.battery === "number"
        ? properties.battery
        : typeof properties.battery_level === "number"
        ? properties.battery_level
        : null;

    if (Object.keys(properties).length > 0) {
      await saveTelemetrySnapshot(deviceId, properties, {
        timestamp: configData?.timestamp ?? Date.now(),
        eventType: "CONFIG_FETCH",
        source: "config",
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          device: deviceData,
          config: configData,
          metrics: {
            temperature_left: Number.isFinite(temperatureLeft)
              ? temperatureLeft
              : null,
            temperature_right: Number.isFinite(temperatureRight)
              ? temperatureRight
              : null,
            battery,
          },
        },
        message: "Device information fetched successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Device Info API] Failed to fetch device info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch device information",
      },
      { status: 500 }
    );
  }
}

