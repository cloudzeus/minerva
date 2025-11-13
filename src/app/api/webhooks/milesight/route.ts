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

    console.log("[Milesight Webhook] Received", payloads.length, "event(s)");

    let eventsProcessed = 0;

    for (const payload of payloads) {
      try {
        // Extract from Milesight webhook structure
        const deviceId = payload.deviceId?.toString();
        const webhookEvent = payload.webhookPushEvent;

        if (!webhookEvent) {
          console.warn("[Milesight Webhook] No webhookPushEvent in payload:", payload);
          continue;
        }

        const eventType = webhookEvent.eventType || "unknown";
        const eventId = webhookEvent.eventId;
        const eventData = webhookEvent.data;

        // Extract device profile
        const deviceProfile = eventData?.deviceProfile;
        const deviceName = deviceProfile?.name;
        const deviceSn = deviceProfile?.sn;
        const deviceModel = deviceProfile?.model;
        const deviceDevEUI = deviceProfile?.devEUI;

        // Store general webhook event
        await prisma.milesightWebhookEvent.create({
          data: {
            eventType,
            deviceId,
            deviceName,
            payload: JSON.stringify(payload),
            processed: false,
          },
        });

        // If it's device data, store telemetry
        if (eventType === "DEVICE_DATA" && eventData && deviceId) {
          const dataPayload = eventData.payload || {};
          
          // Extract common sensor values
          const temperature =
            dataPayload.temperature ||
            dataPayload.temperature_left ||
            dataPayload.temperature_right ||
            null;
          const humidity = dataPayload.humidity || null;
          const battery = dataPayload.battery || null;

          await prisma.milesightDeviceTelemetry.create({
            data: {
              deviceId,
              eventId: eventId || `evt-${Date.now()}`,
              eventType,
              eventVersion: webhookEvent.eventVersion,
              dataTimestamp: BigInt(eventData.ts || webhookEvent.eventCreatedTime * 1000),
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

          console.log("[Milesight Webhook] Stored telemetry for device:", deviceId);
        }

        eventsProcessed++;
      } catch (eventError: any) {
        console.error("[Milesight Webhook] Error processing event:", eventError);
        // Continue processing other events
      }
    }

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

