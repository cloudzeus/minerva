"use client";

import * as React from "react";
import { toast } from "sonner";

interface RealtimeEvent {
  type: string;
  data?: any;
  timestamp: number;
  message?: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  events: RealtimeEvent[];
}

const RealtimeContext = React.createContext<RealtimeContextType>({
  isConnected: false,
  lastEvent: null,
  events: [],
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState<RealtimeEvent | null>(null);
  const [events, setEvents] = React.useState<RealtimeEvent[]>([]);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = React.useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    console.log("[Realtime] Connecting to SSE...");
    const eventSource = new EventSource("/api/realtime");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[Realtime] Connected");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data);
        console.log("[Realtime] Event received:", data);

        setLastEvent(data);
        setEvents((prev) => [data, ...prev].slice(0, 100)); // Keep last 100 events

        // Handle different event types
        switch (data.type) {
          case "connected":
            console.log("[Realtime]", data.message);
            break;

          case "new_telemetry":
            toast.success("New telemetry data received", {
              description: `Device: ${data.data?.deviceName || "Unknown"}`,
              duration: 3000,
            });
            break;

          case "device_status_changed":
            const status = data.data?.status;
            const deviceName = data.data?.deviceName;
            if (status === "ONLINE") {
              toast.success(`${deviceName} is now online`, {
                duration: 3000,
              });
            } else {
              toast.error(`${deviceName} went offline`, {
                duration: 3000,
              });
            }
            break;

          case "new_device":
            toast.info("New device added", {
              description: data.data?.deviceName,
              duration: 4000,
            });
            break;

          case "keepalive":
            // Silent keepalive
            break;

          default:
            console.log("[Realtime] Unknown event type:", data.type);
        }
      } catch (error) {
        console.error("[Realtime] Error parsing event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Realtime] Connection error:", error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[Realtime] Attempting to reconnect...");
        connect();
      }, 5000);
    };
  }, []);

  React.useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        console.log("[Realtime] Disconnecting...");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent, events }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = React.useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
}

// Hook to subscribe to specific event types
export function useRealtimeEvent(
  eventType: string,
  callback: (data: any) => void
) {
  const { lastEvent } = useRealtime();

  React.useEffect(() => {
    if (lastEvent && lastEvent.type === eventType) {
      callback(lastEvent.data);
    }
  }, [lastEvent, eventType, callback]);
}

