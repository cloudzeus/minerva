"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FaCircle } from "react-icons/fa";
import { formatDateTime } from "@/lib/utils";

interface LiveWebhookIndicatorProps {
  isActive: boolean;
  hasRecentActivity: boolean;
  lastEventAt?: Date | null;
}

export function LiveWebhookIndicator({
  isActive,
  hasRecentActivity: initialRecentActivity,
  lastEventAt,
}: LiveWebhookIndicatorProps) {
  const [isPulsing, setIsPulsing] = useState(initialRecentActivity);

  useEffect(() => {
    setIsPulsing(initialRecentActivity);
    
    if (initialRecentActivity) {
      // Stop pulsing after 10 seconds
      const timer = setTimeout(() => setIsPulsing(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [initialRecentActivity, lastEventAt]);

  if (!isActive) {
    return (
      <Badge variant="secondary" className="gap-2 text-xs">
        <FaCircle className="h-2 w-2 text-gray-500" />
        Webhook Disabled
      </Badge>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge
        variant={isPulsing ? "default" : "secondary"}
        className="gap-2 text-xs"
      >
        <div className="relative">
          <FaCircle
            className={`h-2 w-2 ${
              isPulsing ? "text-green-500" : "text-blue-500"
            }`}
          />
          {isPulsing && (
            <span className="absolute inset-0 h-2 w-2 animate-ping">
              <FaCircle className="h-2 w-2 text-green-500" />
            </span>
          )}
        </div>
        {isPulsing ? "Receiving Data" : "Active"}
      </Badge>
      {lastEventAt && (
        <span className="text-xs text-muted-foreground">
          Last: {formatDateTime(lastEventAt)}
        </span>
      )}
    </div>
  );
}

