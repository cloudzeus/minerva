"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/lib/realtime-context";
import { DeviceStatsCards } from "@/components/device-stats-cards";

interface RealtimeStatsCardsProps {
  initialTotalDevices: number;
  initialOnlineDevices: number;
  initialAvgTemperature: number | null;
  initialTotalGateways: number;
  initialOnlineGateways: number;
}

export function RealtimeStatsCards({
  initialTotalDevices,
  initialOnlineDevices,
  initialAvgTemperature,
  initialTotalGateways,
  initialOnlineGateways,
}: RealtimeStatsCardsProps) {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalDevices: initialTotalDevices,
    onlineDevices: initialOnlineDevices,
    avgTemperature: initialAvgTemperature,
    totalGateways: initialTotalGateways,
    onlineGateways: initialOnlineGateways,
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
      totalGateways={stats.totalGateways}
      onlineGateways={stats.onlineGateways}
    />
  );
}

