"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MilesightDeviceCache } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaCircle, FaEye } from "react-icons/fa";
import {
  DataTableRowActions,
  DropdownMenuItem,
} from "@/components/data-table/data-table-row-actions";

interface DeviceWithTelemetry extends MilesightDeviceCache {
  _count: {
    telemetryData: number;
  };
}

export function createDeviceColumns(
  onViewDetails: (deviceId: string) => void
): ColumnDef<DeviceWithTelemetry>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name") || "—"}</span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "deviceType",
      header: "Model",
      cell: ({ row }) => {
        const type = row.getValue("deviceType") as string;
        return <span className="font-mono text-xs">{type || "—"}</span>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "sn",
      header: "Serial Number",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("sn") || "—"}</span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "devEUI",
      header: "DevEUI",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("devEUI") || "—"}</span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "lastStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("lastStatus") as string;
        return (
          <Badge variant={status === "ONLINE" ? "default" : "secondary"} className="text-[8px]">
            <FaCircle
              className={`mr-1 h-2 w-2 ${
                status === "ONLINE" ? "text-green-500" : "text-gray-500"
              }`}
            />
            {status || "UNKNOWN"}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "_count.telemetryData",
      header: "Telemetry",
      cell: ({ row }) => (
        <span className="text-xs">{row.original._count.telemetryData} records</span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "lastSyncAt",
      header: "Last Sync",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.getValue("lastSyncAt"))}
        </span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <DataTableRowActions>
            <DropdownMenuItem
              className="text-xs"
              onClick={() => onViewDetails(device.deviceId)}
            >
              <FaEye className="mr-2 h-3 w-3 text-blue-500" />
              View Details
            </DropdownMenuItem>
          </DataTableRowActions>
        );
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

