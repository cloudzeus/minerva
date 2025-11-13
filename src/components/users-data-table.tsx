"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { DataTable } from "@/components/data-table/data-table";
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
import { FaPlus } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface UsersDataTableProps {
  users: (User & { _count: { activityLogs: number } })[];
}

export function UsersDataTable({ users }: UsersDataTableProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const columns = createUserColumns(handleEdit, handleToggleStatus, handleDeleteClick);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <FaPlus className="mr-2 h-3 w-3" />
          CREATE USER
        </Button>
      </div>

      <DataTable columns={columns} data={users} />

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

