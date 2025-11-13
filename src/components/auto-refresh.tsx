"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  intervalMinutes?: number;
}

/**
 * Auto-refresh component that reloads the page data every X minutes
 * Does NOT use real-time hooks to avoid re-render issues
 */
export function AutoRefresh({ intervalMinutes = 5 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`[AutoRefresh] Setting up ${intervalMinutes} minute refresh interval`);

    const interval = setInterval(() => {
      console.log("[AutoRefresh] Refreshing dashboard data...");
      router.refresh(); // Refresh server data without full page reload
    }, intervalMs);

    return () => {
      console.log("[AutoRefresh] Cleaning up refresh interval");
      clearInterval(interval);
    };
  }, [intervalMinutes, router]);

  return null; // This component doesn't render anything
}

