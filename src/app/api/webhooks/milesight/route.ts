/**
 * Milesight Webhook Endpoint
 * 
 * This endpoint receives POST requests from Milesight Development Platform
 * when device events occur (online, offline, alarms, etc.)
 * 
 * SECURITY:
 * - No authentication required (webhook from external service)
 * - Optional verification token can be checked
 * - Rate limiting recommended in production
 * - Validates payload structure before processing
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToClients } from "@/lib/realtime-broadcast";
import { sendTemperatureAlertEmail } from "@/lib/email";
import { recordDeviceHeartbeat } from "@/lib/device-monitor";

export async function POST(request: NextRequest) {
  try {
    // Get webhook settings
    const webhookSettings = await prisma.milesightWebhookSettings.findFirst();

    // Check if webhook is enabled
    if (!webhookSettings || !webhookSettings.enabled) {
      return NextResponse.json(
        { error: "Webhook is not enabled" },
        { status: 403 }
      );
    }

    // Optional: Verify token if configured
    const verificationToken = request.nextUrl.searchParams.get("token");
    const webhookSecret = request.headers.get("X-Webhook-Secret");
    const webhookUuid = request.headers.get("X-Webhook-UUID");

    // Verify using verification token (query param)
    if (webhookSettings.verificationToken && verificationToken) {
      if (verificationToken !== webhookSettings.verificationToken) {
        console.log("[Milesight Webhook] Invalid verification token");
        return NextResponse.json(
          { error: "Invalid verification token" },
          { status: 401 }
        );
      }
    }

    // Verify using webhook secret (header)
    if (webhookSecret && webhookSecret !== webhookSettings.webhookSecret) {
      console.log("[Milesight Webhook] Invalid webhook secret");
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    // Verify using webhook UUID (header)
    if (webhookUuid && webhookUuid !== webhookSettings.webhookUuid) {
      console.log("[Milesight Webhook] Invalid webhook UUID");
      return NextResponse.json(
        { error: "Invalid webhook UUID" },
        { status: 401 }
      );
    }

    // Parse webhook payload - can be single object or array
    const rawPayload = await request.json();
    const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

    console.log("=".repeat(80));
    console.log("[Milesight Webhook] Received", payloads.length, "event(s)");
    console.log("[Milesight Webhook] Raw payload:", JSON.stringify(rawPayload, null, 2));
    console.log("=".repeat(80));

    let eventsProcessed = 0;

    for (const payload of payloads) {
      try {
        console.log("\n--- Processing Event ---");
        console.log("Payload:", JSON.stringify(payload, null, 2));
        
        // Milesight sends events directly (not wrapped in webhookPushEvent)
        const eventType = payload.eventType || "unknown";
        const eventId = payload.eventId;
        const eventData = payload.data;

        console.log("Event Type:", eventType);
        console.log("Event ID:", eventId);

        if (!eventData) {
          console.warn("[Milesight Webhook] ❌ No data in payload");
          continue;
        }

        // Extract device profile from data
        const deviceProfile = eventData.deviceProfile;
        const deviceId = deviceProfile?.deviceId?.toString();
        const deviceName = deviceProfile?.name;
        const deviceSn = deviceProfile?.sn;
        const deviceModel = deviceProfile?.model;
        const deviceDevEUI = deviceProfile?.devEUI;

        console.log("Device Profile:", {
          deviceId,
          deviceName,
          deviceSn,
          deviceModel,
          deviceDevEUI,
        });
        console.log("Data Type:", eventData.type);
        console.log("Data Payload:", eventData.payload);

        // Store general webhook event
        console.log("✅ Storing webhook event...");
        const webhookEvent = await prisma.milesightWebhookEvent.create({
          data: {
            eventType,
            deviceId,
            deviceName,
            payload: JSON.stringify(payload),
            processed: false,
          },
        });
        console.log("✅ Webhook event stored:", webhookEvent.id);

        // If it's device data, store telemetry
        console.log("Checking if should store telemetry:");
        console.log("  - eventType === 'DEVICE_DATA'?", eventType === "DEVICE_DATA");
        console.log("  - eventData exists?", !!eventData);
        console.log("  - deviceId exists?", !!deviceId);
        
        if (eventType === "DEVICE_DATA" && eventData && deviceId) {
          console.log("📊 Processing telemetry data...");
          
          // Check if device exists in cache - Match by SERIAL NUMBER
          console.log("🔍 Checking if device exists in cache...");
          console.log("  - Looking for SN:", deviceSn);
          console.log("  - Looking for deviceId:", deviceId);
          
          // Try to find by serial number first (more reliable)
          let existingDevice = deviceSn
            ? await prisma.milesightDeviceCache.findFirst({
                where: { sn: deviceSn },
              })
            : null;

          // Fallback to deviceId if SN lookup failed
          if (!existingDevice && deviceId) {
            existingDevice = await prisma.milesightDeviceCache.findUnique({
              where: { deviceId },
            });
          }

          if (!existingDevice) {
            console.warn(
              `⚠️ Device SN:${deviceSn} ID:${deviceId} (${deviceName}) not registered in system. Skipping telemetry.`
            );
            console.warn(
              "   To receive data from this device, add it via Admin → Devices → Milesight Devices"
            );
            eventsProcessed++;
            continue;
          }
          
          console.log("✅ Device found in cache:");
          console.log("  - DB Record ID:", existingDevice.id);
          console.log("  - DB deviceId:", existingDevice.deviceId);
          console.log("  - DB SN:", existingDevice.sn);
          console.log("  - Name:", existingDevice.name);
          
          // Update device info from webhook (use the DB deviceId for consistency)
          const actualDeviceId = existingDevice.deviceId;
          
          await prisma.milesightDeviceCache.update({
            where: { id: existingDevice.id },
            data: {
              name: deviceName || undefined,
              sn: deviceSn || undefined,
              devEUI: deviceDevEUI || undefined,
              deviceType: deviceModel || undefined,
              lastStatus: "ONLINE",
              lastSyncAt: new Date(),
            },
          });
          console.log("✅ Device info updated");
          
          const dataPayload = eventData.payload || {};
          console.log("Data Payload Keys:", Object.keys(dataPayload));
          console.log("Full Data Payload:", JSON.stringify(dataPayload, null, 2));
          
          // Extract common sensor values
          const temperature =
            dataPayload.temperature ||
            dataPayload.temperature_left ||
            dataPayload.temperature_right ||
            null;
          const humidity = dataPayload.humidity || null;
          const battery = dataPayload.battery || null;

          console.log("Extracted Values:", {
            temperature,
            humidity,
            battery,
          });

          console.log("Creating telemetry record...");
          console.log("  - Using deviceId:", actualDeviceId);
          const telemetryRecord = await prisma.milesightDeviceTelemetry.create({
            data: {
              deviceId: actualDeviceId,
              eventId: eventId || `evt-${Date.now()}`,
              eventType,
              eventVersion: payload.eventVersion,
              dataTimestamp: BigInt(eventData.ts || payload.eventCreatedTime * 1000),
              dataType: eventData.type || "PROPERTY",
              payload: JSON.stringify(dataPayload),
              deviceSn,
              deviceName,
              deviceModel,
              deviceDevEUI,
              temperature: temperature ? parseFloat(temperature) : null,
              humidity: humidity ? parseFloat(humidity) : null,
              battery: battery ? parseInt(battery) : null,
              sensorData: JSON.stringify(dataPayload),
              processed: false,
            },
          });
        await recordDeviceHeartbeat(
          actualDeviceId,
          Number(telemetryRecord.dataTimestamp),
          "webhook"
        );
          console.log("✅ Telemetry record created:", telemetryRecord.id);
          console.log("[Milesight Webhook] ✅ Stored telemetry for device:", deviceId);

          // Check temperature alerts for thermometer devices (TS302, etc.)
          await checkTemperatureAlerts(actualDeviceId, deviceName || deviceId, dataPayload);

          // Broadcast real-time event to all connected clients - include actual sensor values
          const broadcastData = {
            type: "new_telemetry",
            timestamp: Date.now(),
            data: {
              deviceId: actualDeviceId,
              deviceName,
              eventType,
              ...dataPayload, // Include all sensor data (temperature_left, temperature_right, battery, etc.)
            },
          };
          console.log("📡 Broadcasting to SSE clients:", broadcastData);
          broadcastToClients(broadcastData);
        } else {
          console.log("⚠️ Skipping telemetry storage (not DEVICE_DATA or missing data)");
        }

        eventsProcessed++;
        console.log("✅ Event processed successfully");
        console.log("--- End Event ---\n");
      } catch (eventError: any) {
        console.error("❌ [Milesight Webhook] Error processing event:", eventError);
        console.error("Error stack:", eventError.stack);
        // Continue processing other events
      }
    }

    console.log("=".repeat(80));
    console.log(`[Milesight Webhook] ✅ Processed ${eventsProcessed} event(s) successfully`);
    console.log("=".repeat(80));

    // Update webhook settings with last event info
    if (eventsProcessed > 0) {
      await prisma.milesightWebhookSettings.update({
        where: { id: webhookSettings.id },
        data: {
          lastEventAt: new Date(),
          lastEventType: payloads[0]?.webhookPushEvent?.eventType || "unknown",
          totalEventsCount: { increment: eventsProcessed },
        },
      });
    }

    // Log to console for debugging
    console.log(`[Milesight Webhook] Processed ${eventsProcessed} event(s) successfully`);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Events received successfully",
        eventsProcessed,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Milesight Webhook] Error processing webhook:", error);

    // Update error status in settings
    try {
      const webhookSettings = await prisma.milesightWebhookSettings.findFirst();
      if (webhookSettings) {
        await prisma.milesightWebhookSettings.update({
          where: { id: webhookSettings.id },
          data: {
            lastError: error.message,
            lastTestStatus: "FAILED",
            lastTestAt: new Date(),
          },
        });
      }
    } catch (dbError) {
      console.error("[Milesight Webhook] Failed to log error:", dbError);
    }

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if temperature exceeds thresholds and send alerts
 */
async function checkTemperatureAlerts(
  deviceId: string,
  deviceName: string,
  sensorData: any
) {
  try {
    // Get alert settings for this device
    const alertSettings = await prisma.temperatureAlert.findUnique({
      where: { deviceId },
    });

    if (!alertSettings || !alertSettings.enabled) {
      return; // No alert configured or disabled
    }

    // Extract all temperature values from sensor data
    const temperatures: { key: string; value: number }[] = [];
    
    Object.entries(sensorData).forEach(([key, value]) => {
      if (
        (key.toLowerCase().includes("temperature") || key === "temp") &&
        typeof value === "number"
      ) {
        temperatures.push({ key, value });
      }
    });

    if (temperatures.length === 0) {
      return; // No temperature data
    }

    // Check each temperature value against thresholds
    for (const { key, value } of temperatures) {
      const isBelowMin = value < alertSettings.minTemperature;
      const isAboveMax = value > alertSettings.maxTemperature;

      if (isBelowMin || isAboveMax) {
        // Check cooldown period
        const now = new Date();
        const lastAlertTime = alertSettings.lastAlertSentAt;
        const cooldownMs = alertSettings.alertCooldown * 1000;

        if (
          lastAlertTime &&
          now.getTime() - lastAlertTime.getTime() < cooldownMs
        ) {
          console.log(
            `[Temperature Alert] Skipping alert for ${deviceName} - still in cooldown period`
          );
          continue; // Still in cooldown
        }

        // Send alert email
        console.log(
          `[Temperature Alert] 🚨 Temperature ${isBelowMin ? "too low" : "too high"} for ${deviceName}: ${value}°C`
        );

        const recipients = JSON.parse(alertSettings.emailRecipients);
        
        await sendTemperatureAlertEmail({
          deviceId,
          deviceName,
          currentTemperature: value,
          minThreshold: alertSettings.minTemperature,
          maxThreshold: alertSettings.maxTemperature,
          alertType: isBelowMin ? "MIN" : "MAX",
          timestamp: now,
          recipients,
        });

        // Update last alert time and increment counter
        await prisma.temperatureAlert.update({
          where: { deviceId },
          data: {
            lastAlertSentAt: now,
            totalAlertsSent: alertSettings.totalAlertsSent + 1,
          },
        });

        console.log(
          `[Temperature Alert] ✅ Alert sent to ${recipients.length} recipient(s)`
        );

        // Only send one alert per webhook event (first threshold exceeded)
        break;
      }
    }
  } catch (error: any) {
    console.error("[Temperature Alert] Error checking alerts:", error);
    // Don't throw - we don't want to fail the webhook if alert checking fails
  }
}

// Support GET for health check / testing
export async function GET(request: NextRequest) {
  const webhookSettings = await prisma.milesightWebhookSettings.findFirst();

  return NextResponse.json({
    status: "ok",
    enabled: webhookSettings?.enabled || false,
    endpoint: "/api/webhooks/milesight",
    lastEvent: webhookSettings?.lastEventAt
      ? {
          at: webhookSettings.lastEventAt,
          type: webhookSettings.lastEventType,
          totalCount: webhookSettings.totalEventsCount,
        }
      : null,
  });
}

