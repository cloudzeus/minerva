"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/lib/realtime-context";
import { MilesightDeviceCache } from "@prisma/client";

interface RealtimeDeviceListProps {
  children: React.ReactNode;
}

export function RealtimeDeviceList({ children }: RealtimeDeviceListProps) {
  const router = useRouter();

  // Refresh on new telemetry
  useRealtimeEvent("new_telemetry", () => {
    console.log("[RealtimeDeviceList] Refreshing due to new telemetry");
    router.refresh();
  });

  // Refresh on device status change
  useRealtimeEvent("device_status_changed", () => {
    console.log("[RealtimeDeviceList] Refreshing due to status change");
    router.refresh();
  });

  // Refresh on new device
  useRealtimeEvent("new_device", () => {
    console.log("[RealtimeDeviceList] Refreshing due to new device");
    router.refresh();
  });

  return <>{children}</>;
}

