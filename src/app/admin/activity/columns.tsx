"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ActivityLog, User } from "@prisma/client";
import { RoleBadge } from "@/components/role-badge";
import { formatDateTime } from "@/lib/utils";
import { FaCircle } from "react-icons/fa";

const activityColors: Record<string, string> = {
  LOGIN: "text-green-500",
  LOGOUT: "text-gray-500",
  USER_CREATED: "text-blue-500",
  USER_UPDATED: "text-yellow-500",
  USER_DELETED: "text-red-500",
  PASSWORD_CHANGED: "text-purple-500",
  ROLE_CHANGED: "text-orange-500",
  PROFILE_UPDATED: "text-cyan-500",
};

interface ActivityLogTableData extends ActivityLog {
  user: User;
}

export const activityColumns: ColumnDef<ActivityLogTableData>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FaCircle
          className={`h-2 w-2 ${
            activityColors[row.getValue("type")] || "text-gray-500"
          }`}
        />
        <span className="font-medium">{row.getValue("type")}</span>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "user.name",
    id: "userName",
    header: "User",
    cell: ({ row }) => row.original.user.name || row.original.user.email,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "user.role",
    id: "userRole",
    header: "Role",
    cell: ({ row }) => <RoleBadge role={row.original.user.role} />,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="max-w-md truncate">{row.getValue("description")}</span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.getValue("createdAt"))}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
];

