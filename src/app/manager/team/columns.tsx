"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

interface TeamMemberTableData extends User {
  _count: {
    activityLogs: number;
  };
}

export const teamMemberColumns: ColumnDef<TeamMemberTableData>[] = [
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
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return isActive ? (
        <Badge variant="default" className="gap-1 text-xs">
          <FaToggleOn className="text-green-500" />
          Active
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1 text-xs">
          <FaToggleOff className="text-gray-500" />
          Inactive
        </Badge>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "_count.activityLogs",
    header: "Activities",
    cell: ({ row }) => row.original._count.activityLogs,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "lastLoginAt",
    header: "Last Login",
    cell: ({ row }) => {
      const lastLoginAt = row.getValue("lastLoginAt") as Date | null;
      return (
        <span className="text-muted-foreground">
          {lastLoginAt ? formatDateTime(lastLoginAt) : "Never"}
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.getValue("createdAt"))}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
];

