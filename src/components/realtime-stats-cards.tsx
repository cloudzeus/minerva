"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/lib/realtime-context";
import { DeviceStatsCards } from "@/components/device-stats-cards";

interface RealtimeStatsCardsProps {
  initialTotalDevices: number;
  initialOnlineDevices: number;
  initialAvgTemperature: number | null;
  initialAvgHumidity: number | null;
  initialAvgBattery: number | null;
}

export function RealtimeStatsCards({
  initialTotalDevices,
  initialOnlineDevices,
  initialAvgTemperature,
  initialAvgHumidity,
  initialAvgBattery,
}: RealtimeStatsCardsProps) {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalDevices: initialTotalDevices,
    onlineDevices: initialOnlineDevices,
    avgTemperature: initialAvgTemperature,
    avgHumidity: initialAvgHumidity,
    avgBattery: initialAvgBattery,
  });

  // Listen for new telemetry - refresh stats
  useRealtimeEvent("new_telemetry", () => {
    router.refresh();
  });

  // Listen for device status changes
  useRealtimeEvent("device_status_changed", () => {
    router.refresh();
  });

  // Listen for new devices
  useRealtimeEvent("new_device", () => {
    router.refresh();
  });

  return (
    <DeviceStatsCards
      totalDevices={stats.totalDevices}
      onlineDevices={stats.onlineDevices}
      avgTemperature={stats.avgTemperature}
      avgHumidity={stats.avgHumidity}
      avgBattery={stats.avgBattery}
    />
  );
}

