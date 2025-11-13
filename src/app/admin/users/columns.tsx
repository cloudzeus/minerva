"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User, Role } from "@prisma/client";
import { RoleBadge } from "@/components/role-badge";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaToggleOn, FaToggleOff, FaEdit, FaTrash } from "react-icons/fa";
import {
  DataTableRowActions,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/data-table/data-table-row-actions";

interface UserTableData extends User {
  _count: {
    activityLogs: number;
  };
}

export function createUserColumns(
  onEdit: (user: User) => void,
  onToggleStatus: (userId: string, isActive: boolean) => void,
  onDelete: (userId: string, userName: string) => void
): ColumnDef<UserTableData>[] {
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
      accessorKey: "email",
      header: "Email",
      enableSorting: true,
      enableHiding: true,
    },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as Role;
      return <RoleBadge role={role} />;
    },
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DataTableRowActions>
            <DropdownMenuItem
              className="text-xs"
              onClick={() => onEdit(user)}
            >
              <FaEdit className="mr-2 h-3 w-3 text-blue-500" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() => onToggleStatus(user.id, !user.isActive)}
            >
              {user.isActive ? (
                <>
                  <FaToggleOff className="mr-2 h-3 w-3 text-gray-500" />
                  Deactivate
                </>
              ) : (
                <>
                  <FaToggleOn className="mr-2 h-3 w-3 text-green-500" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive"
              onClick={() => onDelete(user.id, user.name || user.email)}
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

