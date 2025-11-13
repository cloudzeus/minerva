/**
 * Real-time broadcast utilities for Server-Sent Events
 */

// Store active SSE connections
const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  console.log("[SSE Broadcast] Client added. Total clients:", clients.size);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
  console.log("[SSE Broadcast] Client removed. Total clients:", clients.size);
}

export function broadcastToClients(event: any) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const deadClients: ReadableStreamDefaultController[] = [];

  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error("[SSE Broadcast] Error sending to client:", error);
      deadClients.push(controller);
    }
  });

  // Remove dead clients
  deadClients.forEach((client) => clients.delete(client));
  
  console.log("[SSE Broadcast] Sent event to", clients.size, "clients:", event.type);
}

export function getClientCount() {
  return clients.size;
}

