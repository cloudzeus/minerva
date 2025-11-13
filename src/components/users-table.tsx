"use client";

import { User } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import { formatDateTime } from "@/lib/utils";
import { FaEdit, FaTrash, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ToggleUserStatusButton } from "@/components/toggle-user-status-button";

interface UsersTableProps {
  users: (User & { _count: { activityLogs: number } })[];
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="uppercase">NAME</TableHead>
          <TableHead className="uppercase">EMAIL</TableHead>
          <TableHead className="uppercase">ROLE</TableHead>
          <TableHead className="uppercase">STATUS</TableHead>
          <TableHead className="uppercase">ACTIVITIES</TableHead>
          <TableHead className="uppercase">JOINED</TableHead>
          <TableHead className="uppercase text-right">ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name || "—"}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <RoleBadge role={user.role} />
            </TableCell>
            <TableCell>
              {user.isActive ? (
                <Badge variant="default" className="gap-1">
                  <FaToggleOn className="text-green-500" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <FaToggleOff className="text-gray-500" />
                  Inactive
                </Badge>
              )}
            </TableCell>
            <TableCell>{user._count.activityLogs}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(user.createdAt)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    <FaEdit className="mr-1 h-3 w-3 text-blue-500" />
                    EDIT
                  </Link>
                </Button>
                <ToggleUserStatusButton
                  userId={user.id}
                  isActive={user.isActive}
                />
                <DeleteUserButton userId={user.id} userName={user.name || user.email} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

