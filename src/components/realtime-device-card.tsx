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
  sensorNameLeft?: string | null;
  sensorNameRight?: string | null;
}

export function RealtimeDeviceCard({
  deviceId,
  deviceName,
  deviceStatus,
  deviceType,
  deviceModel,
  initialTelemetryData,
  userRole,
  sensorNameLeft,
  sensorNameRight,
}: RealtimeDeviceCardProps) {
  // Simple pass-through - no real-time updates, just show database data
  return (
    <DeviceTelemetryCard
      deviceId={deviceId}
      deviceName={deviceName}
      deviceStatus={deviceStatus}
      deviceType={deviceType}
      deviceModel={deviceModel}
      telemetryData={initialTelemetryData}
      userRole={userRole}
      sensorNameLeft={sensorNameLeft}
      sensorNameRight={sensorNameRight}
    />
  );
}

