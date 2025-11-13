"use client";

import { useState } from "react";
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
import { FaEdit, FaPlus, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ToggleUserStatusButton } from "@/components/toggle-user-status-button";
import { UserFormModal } from "@/components/user-form-modal";

interface UsersTableWithModalsProps {
  users: (User & { _count: { activityLogs: number } })[];
}

export function UsersTableWithModals({ users }: UsersTableWithModalsProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <FaPlus className="mr-2 h-3 w-3" />
          CREATE USER
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase">Name</TableHead>
              <TableHead className="text-xs uppercase">Email</TableHead>
              <TableHead className="text-xs uppercase">Role</TableHead>
              <TableHead className="text-xs uppercase">Status</TableHead>
              <TableHead className="text-xs uppercase">Activities</TableHead>
              <TableHead className="text-xs uppercase">Joined</TableHead>
              <TableHead className="text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="text-xs font-medium">{user.name || "—"}</TableCell>
                <TableCell className="text-xs">{user.email}</TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>
                  {user.isActive ? (
                    <Badge variant="default" className="gap-1 text-xs">
                      <FaToggleOn className="text-green-500" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <FaToggleOff className="text-gray-500" />
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{user._count.activityLogs}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(user.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <FaEdit className="mr-1 h-3 w-3 text-blue-500" />
                      <span className="text-xs">EDIT</span>
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
      </div>

      <UserFormModal
        mode="create"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {selectedUser && (
        <UserFormModal
          mode="edit"
          user={selectedUser}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setSelectedUser(null);
          }}
        />
      )}
    </>
  );
}

