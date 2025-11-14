"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeviceActionsProps {
  deviceId: string;
  deviceLabel: string;
  children?: (params: {
    fetchInfo: () => void;
    isLoading: boolean;
  }) => React.ReactNode;
}

type ApiResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

export function DeviceActions({
  deviceId,
  deviceLabel,
  children,
}: DeviceActionsProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [payload, setPayload] = React.useState<ApiResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDeviceInfo = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPayload(null);
    try {
      const response = await fetch(
        `/api/admin/devices/milesight/${deviceId}/info`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json: ApiResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch device information");
      }

      setPayload(json);
    } catch (err: any) {
      setError(err?.message || "Unknown error occurred");
    } finally {
      setIsLoading(false);
      setOpen(true);
    }
  }, [deviceId]);

  const renderMetrics = () => {
    const metrics = (payload?.data as any)?.metrics;
    if (!metrics) return null;

    const rows = [
      { label: "Temperature Left", value: metrics.temperature_left, unit: "°C" },
      { label: "Temperature Right", value: metrics.temperature_right, unit: "°C" },
      { label: "Battery", value: metrics.battery, unit: "%" },
    ].filter((row) => row.value !== null && row.value !== undefined);

    if (rows.length === 0) return null;

    return (
      <div className="mb-4 rounded-md border border-border/40 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Live Metrics
        </p>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md bg-muted/40 p-2">
              <p className="text-[10px] text-muted-foreground">{row.label}</p>
              <p className="text-lg font-semibold">
                {typeof row.value === "number" ? row.value.toFixed(1) : row.value}
                {row.unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading && !payload && !error) {
      return (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Fetching device information...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      );
    }

    if (payload?.data) {
      return (
        <>
          {renderMetrics()}
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border/40 bg-muted/30">
            <pre className="whitespace-pre-wrap break-all p-3 text-[11px]">
              {JSON.stringify(payload.data, null, 2)}
            </pre>
          </div>
        </>
      );
    }

    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No details available.
      </div>
    );
  };

  const trigger = children ? (
    children({ fetchInfo: fetchDeviceInfo, isLoading })
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="text-[10px]"
      onClick={fetchDeviceInfo}
      disabled={isLoading}
    >
      {isLoading ? "FETCHING..." : "FETCH INFO"}
    </Button>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Device Info — {deviceLabel}
            </DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}

