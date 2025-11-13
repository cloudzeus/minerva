"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { createUserColumns } from "@/app/admin/users/columns";
import { UserFormModal } from "@/components/user-form-modal";
import { deleteUser, toggleUserStatus } from "@/app/actions/users";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FaPlus, FaToggleOn, FaToggleOff, FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { exportToExcel } from "@/lib/excel-export";

interface UsersDataTableProps {
  users: (User & { _count: { activityLogs: number } })[];
}

export function UsersDataTableWithActions({ users }: UsersDataTableProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const result = await toggleUserStatus(userId, isActive);
      if (result.success) {
        toast.success(isActive ? "User activated" : "User deactivated", {
          description: "User status updated successfully",
        });
        router.refresh();
      } else {
        toast.error("Failed to update status", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        toast.success("User deleted", {
          description: `${userToDelete.name} has been removed from the system`,
        });
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to delete user", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleBulkAction = async (action: string, table: any) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedUsers = selectedRows.map((row: any) => row.original);

    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }

    switch (action) {
      case "activate":
        await bulkToggleStatus(selectedUsers, true);
        break;
      case "deactivate":
        await bulkToggleStatus(selectedUsers, false);
        break;
      case "delete":
        if (confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) {
          await bulkDelete(selectedUsers);
        }
        break;
    }
  };

  const bulkToggleStatus = async (users: User[], isActive: boolean) => {
    let successCount = 0;
    for (const user of users) {
      const result = await toggleUserStatus(user.id, isActive);
      if (result.success) successCount++;
    }
    toast.success(`${successCount} user(s) ${isActive ? "activated" : "deactivated"}`);
    router.refresh();
  };

  const bulkDelete = async (users: User[]) => {
    let successCount = 0;
    for (const user of users) {
      const result = await deleteUser(user.id);
      if (result.success) successCount++;
    }
    toast.success(`${successCount} user(s) deleted`);
    router.refresh();
  };

  const handleExport = () => {
    exportToExcel(
      users.map((user) => ({
        name: user.name || "",
        email: user.email,
        role: user.role,
        status: user.isActive ? "Active" : "Inactive",
        activities: user._count.activityLogs,
        joined: user.createdAt,
      })),
      [
        { header: "Name", key: "name", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Role", key: "role", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Activities", key: "activities", width: 15 },
        { header: "Joined", key: "joined", width: 20 },
      ],
      "users"
    );
    toast.success("Excel file exported successfully");
  };

  const columns = createUserColumns(handleEdit, handleToggleStatus, handleDeleteClick);

  const bulkActionItems = [
    {
      label: "Activate Selected",
      value: "activate",
      icon: <FaToggleOn className="h-3 w-3 text-green-500" />,
    },
    {
      label: "Deactivate Selected",
      value: "deactivate",
      icon: <FaToggleOff className="h-3 w-3 text-gray-500" />,
    },
    {
      label: "Delete Selected",
      value: "delete",
      icon: <FaTrash className="h-3 w-3" />,
      variant: "destructive" as const,
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <FaPlus className="mr-2 h-3 w-3" />
          CREATE USER
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        enableRowSelection={true}
        bulkActions={
          <DataTableToolbar
            selectedCount={0}
            onBulkAction={(action) => {
              // This will be called from within DataTable with table context
            }}
            onExport={handleExport}
            bulkActionItems={bulkActionItems}
          />
        }
        exportFileName="users"
      />

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This will permanently delete the user{" "}
              <strong>{userToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

