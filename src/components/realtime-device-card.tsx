"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRealtimeEvent } from "@/lib/realtime-context";
import { DeviceTelemetryCard } from "@/components/device-telemetry-card";
import { MilesightDeviceTelemetry } from "@prisma/client";

interface RealtimeDeviceCardProps {
  deviceId: string;
  deviceName: string;
  deviceStatus: string;
  deviceType?: string;
  deviceModel?: string;
  initialTelemetryData: MilesightDeviceTelemetry[];
}

export function RealtimeDeviceCard({
  deviceId,
  deviceName,
  deviceStatus: initialStatus,
  deviceType,
  deviceModel,
  initialTelemetryData,
}: RealtimeDeviceCardProps) {
  const [telemetryData, setTelemetryData] = useState(initialTelemetryData);
  const [deviceStatus, setDeviceStatus] = useState(initialStatus);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced fetch function - only fetch after 2 seconds of no new events
  const fetchLatestData = useCallback(async () => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/telemetry?limit=2000`);
      if (response.ok) {
        const data = await response.json();
        setTelemetryData(data);
      }
    } catch (error) {
      console.error("[RealtimeDeviceCard] Failed to fetch telemetry:", error);
    }
  }, [deviceId]);

  // Listen for new telemetry events with debouncing
  useRealtimeEvent("new_telemetry", (data) => {
    if (data?.deviceId === deviceId) {
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Set new timeout - only update after 2 seconds of silence
      updateTimeoutRef.current = setTimeout(() => {
        fetchLatestData();
      }, 2000);
    }
  });

  // Listen for device status changes
  useRealtimeEvent("device_status_changed", (data) => {
    if (data?.deviceId === deviceId) {
      setDeviceStatus(data.status);
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DeviceTelemetryCard
      deviceId={deviceId}
      deviceName={deviceName}
      deviceStatus={deviceStatus}
      deviceType={deviceType}
      deviceModel={deviceModel}
      telemetryData={telemetryData}
    />
  );
}

