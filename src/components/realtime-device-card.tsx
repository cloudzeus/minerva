"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [telemetryData, setTelemetryData] = useState(initialTelemetryData);
  const [deviceStatus, setDeviceStatus] = useState(initialStatus);

  // Listen for new telemetry events
  useRealtimeEvent("new_telemetry", (data) => {
    if (data?.deviceId === deviceId) {
      console.log("[RealtimeDeviceCard] New telemetry for", deviceName);
      // Refresh the page to get latest data
      router.refresh();
    }
  });

  // Listen for device status changes
  useRealtimeEvent("device_status_changed", (data) => {
    if (data?.deviceId === deviceId) {
      console.log("[RealtimeDeviceCard] Status changed for", deviceName);
      setDeviceStatus(data.status);
      router.refresh();
    }
  });

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

