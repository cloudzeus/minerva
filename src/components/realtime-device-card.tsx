"use client";

import { useState } from "react";
import { useRealtimeEvent } from "@/lib/realtime-context";
import { DeviceTelemetryCard } from "@/components/device-telemetry-card";
import { MilesightDeviceTelemetry, Role } from "@prisma/client";

interface RealtimeDeviceCardProps {
  deviceId: string;
  deviceName: string;
  deviceStatus: string;
  deviceType?: string;
  deviceModel?: string;
  initialTelemetryData: MilesightDeviceTelemetry[];
  userRole?: Role;
}

export function RealtimeDeviceCard({
  deviceId,
  deviceName,
  deviceStatus: initialStatus,
  deviceType,
  deviceModel,
  initialTelemetryData,
  userRole,
}: RealtimeDeviceCardProps) {
  const [deviceStatus, setDeviceStatus] = useState(initialStatus);
  const [latestValues, setLatestValues] = useState<Record<string, number>>({});

  // Listen for new telemetry events - ONLY update current values, NOT chart data
  useRealtimeEvent("new_telemetry", (data) => {
    if (data?.deviceId === deviceId) {
      // Update ONLY the current sensor values, not the chart
      const newValues: Record<string, number> = {};
      
      if (data.data?.temperature) newValues.temperature = data.data.temperature;
      if (data.data?.humidity) newValues.humidity = data.data.humidity;
      if (data.data?.battery) newValues.battery = data.data.battery;
      
      setLatestValues(prev => ({ ...prev, ...newValues }));
    }
  });

  // Listen for device status changes
  useRealtimeEvent("device_status_changed", (data) => {
    if (data?.deviceId === deviceId) {
      setDeviceStatus(data.status);
    }
  });

  return (
    <DeviceTelemetryCard
      deviceId={deviceId}
      deviceName={deviceName}
      deviceStatus={deviceStatus}
      deviceType={deviceType}
      deviceModel={deviceModel}
      telemetryData={initialTelemetryData}
      userRole={userRole}
      realtimeLatestValues={latestValues}
    />
  );
}

