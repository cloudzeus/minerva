/**
 * Real-time Server-Sent Events (SSE) Endpoint
 * Broadcasts device status updates, telemetry data, and notifications
 */

import { NextRequest } from "next/server";
import { addClient, removeClient } from "@/lib/realtime-broadcast";

export async function GET(request: NextRequest) {
  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add client to active connections
      addClient(controller);

      console.log("[SSE] Client connected");

      // Send initial connection event
      const connectMessage = `data: ${JSON.stringify({
        type: "connected",
        timestamp: Date.now(),
        message: "Real-time connection established",
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));

      // Send keepalive every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          const keepAlive = `data: ${JSON.stringify({
            type: "keepalive",
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(keepAlive));
        } catch (error) {
          clearInterval(keepAliveInterval);
          removeClient(controller);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        removeClient(controller);
        console.log("[SSE] Client disconnected");
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

