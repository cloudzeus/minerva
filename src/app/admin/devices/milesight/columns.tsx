"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MilesightDeviceCache } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaCircle, FaEdit, FaTrash, FaEye, FaInfoCircle, FaPowerOff } from "react-icons/fa";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableRowActions,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/data-table/data-table-row-actions";
import { DeviceActions } from "./device-actions";

export function createDeviceColumns(
  onView: (device: MilesightDeviceCache) => void,
  onEdit: (device: MilesightDeviceCache) => void,
  onDelete: (deviceId: string, deviceName: string) => void,
  onToggleCritical: (device: MilesightDeviceCache, value: boolean) => void
  // onReboot: (deviceId: string) => void // Not available via Milesight OpenAPI - requires gateway NS API
): ColumnDef<MilesightDeviceCache>[] {
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
      accessorKey: "deviceType",
      header: "Type",
      cell: ({ row }) => row.getValue("deviceType") || "—",
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "lastStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("lastStatus") as string;
        return status ? (
          <Badge
            variant={status === "ONLINE" ? "default" : "secondary"}
            className="gap-1 text-[8px]"
          >
            <FaCircle
              className={
                status === "ONLINE" ? "text-green-500" : "text-gray-500"
              }
            />
            {status}
          </Badge>
        ) : (
          <span>—</span>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "tag",
      header: "Tag",
      cell: ({ row }) =>
        row.getValue("tag") ? (
          <Badge variant="outline" className="text-[8px]">
            {row.getValue("tag")}
          </Badge>
        ) : (
          <span>—</span>
        ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: "lastSyncAt",
      header: "Last Synced",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.getValue("lastSyncAt"))}
        </span>
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "isCritical",
      header: "Critical",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <Checkbox
            checked={device.isCritical}
            onCheckedChange={(value) => onToggleCritical(device, !!value)}
            aria-label="Toggle critical monitoring"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div className="flex flex-col gap-2">
            <DeviceActions
              deviceId={device.deviceId}
              deviceLabel={device.name || device.sn || device.deviceId}
            >
              {({ fetchInfo, isLoading }) => (
                <DataTableRowActions>
                  <DropdownMenuItem className="text-xs" onClick={() => onView(device)}>
                    <FaEye className="mr-2 h-3 w-3 text-blue-500" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs" onClick={() => onEdit(device)}>
                    <FaEdit className="mr-2 h-3 w-3 text-green-500" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={() => fetchInfo()}
                  >
                    <FaInfoCircle className="mr-2 h-3 w-3 text-purple-500" />
                    {isLoading ? "Fetching..." : "Fetch Info"}
                  </DropdownMenuItem>
                  {/* Reboot via downlink not available through Milesight OpenAPI
                      Downlink commands must be sent through the gateway's Network Server API
                      {device.deviceType?.toUpperCase().includes("TS302") && device.devEUI && (
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => onReboot(device.deviceId)}
                    >
                      <FaPowerOff className="mr-2 h-3 w-3 text-orange-500" />
                      Reboot Device
                    </DropdownMenuItem>
                  )} */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs text-destructive focus:text-destructive"
                    onClick={() =>
                      onDelete(device.deviceId, device.name || device.sn || device.deviceId)
                    }
                  >
                    <FaTrash className="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </DataTableRowActions>
              )}
            </DeviceActions>
          </div>
        );
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

