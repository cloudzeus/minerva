"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaFileExcel, FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { exportTelemetryToExcel, exportDeviceTelemetry } from "@/app/actions/telemetry-export";

interface ExportTelemetryButtonProps {
  deviceId?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportTelemetryButton({
  deviceId,
  variant = "outline",
  size = "default",
  className,
}: ExportTelemetryButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = deviceId
        ? await exportDeviceTelemetry(deviceId)
        : await exportTelemetryToExcel();

      if (result.success && result.data) {
        // Create download link
        const blob = new Blob(
          [
            Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0)),
          ],
          {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename || "telemetry-export.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(
          `Exported ${result.recordCount} records to Excel`,
          {
            description: result.filename,
          }
        );
      } else {
        toast.error("Export failed", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
      toast.error("Export failed", {
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
    >
      {isExporting ? (
        <>
          <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FaFileExcel className="mr-2 h-4 w-4 text-green-600" />
          Export to Excel
        </>
      )}
    </Button>
  );
}

