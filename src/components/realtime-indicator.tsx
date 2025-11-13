"use client";

import { useRealtime } from "@/lib/realtime-context";
import { FaCircle, FaWifi } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";

export function RealtimeIndicator() {
  const { isConnected } = useRealtime();

  return (
    <Badge
      variant={isConnected ? "default" : "secondary"}
      className="gap-1.5 text-xs"
    >
      <FaCircle
        className={`h-2 w-2 ${
          isConnected ? "animate-pulse text-green-400" : "text-gray-400"
        }`}
      />
      {isConnected ? "Live" : "Connecting..."}
    </Badge>
  );
}

