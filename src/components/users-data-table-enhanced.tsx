"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FaColumns, FaSort, FaSortUp, FaSortDown, FaPlus,
  FaToggleOn, FaToggleOff, FaTrash, FaChevronDown, FaFileExcel 
} from "react-icons/fa";
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
import { exportToExcel } from "@/lib/excel-export";

interface UsersDataTableEnhancedProps {
  users: (User & { _count: { activityLogs: number } })[];
}

export function UsersDataTableEnhanced({ users }: UsersDataTableEnhancedProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const result = await toggleUserStatus(userId, isActive);
      if (result.success) {
        toast.success(isActive ? "User activated" : "User deactivated");
        router.refresh();
      } else {
        toast.error("Failed to update status", { description: result.error });
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
        toast.success("User deleted");
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to delete user", { description: result.error });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleBulkActivate = async () => {
    const selectedUsers = table.getFilteredSelectedRowModel().rows.map(r => r.original);
    let successCount = 0;
    for (const user of selectedUsers) {
      const result = await toggleUserStatus(user.id, true);
      if (result.success) successCount++;
    }
    toast.success(`${successCount} user(s) activated`);
    router.refresh();
  };

  const handleBulkDeactivate = async () => {
    const selectedUsers = table.getFilteredSelectedRowModel().rows.map(r => r.original);
    let successCount = 0;
    for (const user of selectedUsers) {
      const result = await toggleUserStatus(user.id, false);
      if (result.success) successCount++;
    }
    toast.success(`${successCount} user(s) deactivated`);
    router.refresh();
  };

  const handleBulkDelete = async () => {
    const selectedUsers = table.getFilteredSelectedRowModel().rows.map(r => r.original);
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) return;
    
    let successCount = 0;
    for (const user of selectedUsers) {
      const result = await deleteUser(user.id);
      if (result.success) successCount++;
    }
    toast.success(`${successCount} user(s) deleted`);
    router.refresh();
  };

  const handleExport = () => {
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
    exportToExcel(
      dataToExport.map((user) => ({
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

  const tableColumns: ColumnDef<User & { _count: { activityLogs: number } }>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...columns,
  ];

  const table = useReactTable({
    data: users,
    columns: tableColumns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <>
      <div className="space-y-4">
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <FaPlus className="mr-2 h-3 w-3" />
            CREATE USER
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedRowCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedRowCount} row(s) selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      Bulk Actions
                      <FaChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem className="text-xs" onClick={handleBulkActivate}>
                      <FaToggleOn className="mr-2 h-3 w-3 text-green-500" />
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={handleBulkDeactivate}>
                      <FaToggleOff className="mr-2 h-3 w-3 text-gray-500" />
                      Deactivate Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-xs text-destructive focus:text-destructive" 
                      onClick={handleBulkDelete}
                    >
                      <FaTrash className="mr-2 h-3 w-3" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
              <FaFileExcel className="mr-2 h-3 w-3 text-green-600" />
              Export to Excel
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <FaColumns className="mr-2 h-3 w-3" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="text-xs capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs uppercase"
                      style={{ width: header.getSize(), position: "relative" }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? "flex cursor-pointer select-none items-center gap-2" : ""}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="ml-auto">
                              {header.column.getIsSorted() === "asc" ? (
                                <FaSortUp className="h-3 w-3 text-primary" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <FaSortDown className="h-3 w-3 text-primary" />
                              ) : (
                                <FaSort className="h-3 w-3 text-muted-foreground" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border hover:bg-primary ${
                            header.column.getIsResizing() ? "bg-primary" : ""
                          }`}
                        />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColumns.length} className="h-24 text-center text-xs">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserFormModal mode="create" open={createModalOpen} onOpenChange={setCreateModalOpen} />
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
            <AlertDialogTitle className="text-base">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete <strong>{userToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="text-xs">
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

