"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MilesightDeviceCache } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaCircle, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import {
  DataTableRowActions,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/data-table/data-table-row-actions";

export function createDeviceColumns(
  onView: (device: MilesightDeviceCache) => void,
  onEdit: (device: MilesightDeviceCache) => void,
  onDelete: (deviceId: string, deviceName: string) => void
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
            className="gap-1 text-xs"
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
          <Badge variant="outline" className="text-xs">
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <DataTableRowActions>
            <DropdownMenuItem className="text-xs" onClick={() => onView(device)}>
              <FaEye className="mr-2 h-3 w-3 text-blue-500" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={() => onEdit(device)}>
              <FaEdit className="mr-2 h-3 w-3 text-green-500" />
              Edit
            </DropdownMenuItem>
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
        );
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

