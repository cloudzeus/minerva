"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MilesightDeviceCache } from "@prisma/client";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FaColumns,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaPlus,
  FaSync,
  FaFileExcel,
  FaSearch,
} from "react-icons/fa";
import { createDeviceColumns } from "./columns";
import { AddDeviceModal } from "./add-device-modal";
import { EditDeviceModal } from "./edit-device-modal";
import { deleteDevice, searchDevices, syncAllDevices, toggleDeviceCritical, rebootDevice } from "@/app/actions/milesight-devices";
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

interface DevicesDataTableProps {
  devices: MilesightDeviceCache[];
  canManage: boolean;
}

export function DevicesDataTable({ devices: initialDevices, canManage }: DevicesDataTableProps) {
  const router = useRouter();
  const [devices, setDevices] = useState(initialDevices);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [, startCriticalToggle] = useTransition();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MilesightDeviceCache | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const handleView = (device: MilesightDeviceCache) => {
    router.push(`/admin/devices/milesight/${device.deviceId}`);
  };

  const handleEdit = (device: MilesightDeviceCache) => {
    setSelectedDevice(device);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (deviceId: string, deviceName: string) => {
    setDeviceToDelete({ id: deviceId, name: deviceName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteDevice(deviceToDelete.id);
      if (result.success) {
        toast.success("Device deleted");
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to delete device", { description: result.error });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setDeviceToDelete(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    console.log("[DevicesDataTable] Starting sync...");
    
    try {
      const result = await syncAllDevices();
      console.log("[DevicesDataTable] Sync result:", result);
      
      if (result.success) {
        toast.success(`Synced ${result.count} devices from Milesight`);
        router.refresh();
      } else {
        console.error("[DevicesDataTable] Sync failed:", result.error);
        toast.error("Sync failed", { 
          description: result.error,
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("[DevicesDataTable] Sync exception:", error);
      toast.error("An error occurred", {
        description: error.message || "Unknown error",
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    exportToExcel(
      devices.map((device) => ({
        name: device.name || "",
        sn: device.sn || "",
        devEUI: device.devEUI || "",
        imei: device.imei || "",
        type: device.deviceType || "",
        status: device.lastStatus || "",
        tag: device.tag || "",
        lastSync: device.lastSyncAt,
      })),
      [
        { header: "Name", key: "name", width: 20 },
        { header: "Serial Number", key: "sn", width: 20 },
        { header: "DevEUI", key: "devEUI", width: 25 },
        { header: "IMEI", key: "imei", width: 20 },
        { header: "Type", key: "type", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Tag", key: "tag", width: 15 },
        { header: "Last Sync", key: "lastSync", width: 20 },
      ],
      "milesight-devices"
    );
    toast.success("Devices exported to Excel");
  };

  const handleCriticalToggle = (device: MilesightDeviceCache, value: boolean) => {
    startCriticalToggle(async () => {
      const result = await toggleDeviceCritical(device.deviceId, value);
      if (result.success) {
        toast.success(`${device.name || device.sn || device.deviceId} ${value ? "marked as critical" : "removed from critical list"}`);
        router.refresh();
      } else {
        toast.error("Failed to update critical flag", { description: result.error });
      }
    });
  };

  const handleReboot = async (deviceId: string) => {
    startCriticalToggle(async () => {
      const result = await rebootDevice(deviceId);
      if (result.success) {
        router.refresh();
        toast.success("Reboot command sent to TS302 device");
      } else {
        toast.error("Failed to send reboot command", { description: result.error });
      }
    });
  };

  const columns = createDeviceColumns(handleView, handleEdit, handleDeleteClick, handleCriticalToggle, handleReboot);

  const tableColumns: ColumnDef<MilesightDeviceCache>[] = [
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
    data: devices,
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

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <FaSearch className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" className="text-xs" onClick={handleSync} disabled={!canManage || isSyncing}>
              <FaSync className={`mr-2 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "SYNCING..." : "SYNC"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddModalOpen(true)} disabled={!canManage}>
              <FaPlus className="mr-2 h-3 w-3" />
              ADD DEVICE
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={handleExport}>
              <FaFileExcel className="mr-2 h-3 w-3 text-green-600" />
              EXPORT
            </Button>
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
                    {canManage ? "No devices found. Click SYNC to fetch from Milesight." : "Configure Milesight authentication to view devices."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddDeviceModal open={addModalOpen} onOpenChange={setAddModalOpen} />

      {selectedDevice && (
        <EditDeviceModal
          device={selectedDevice}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setSelectedDevice(null);
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete this device?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove <strong>{deviceToDelete?.name}</strong> from Milesight platform. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="text-xs">
              {isDeleting ? "Deleting..." : "Delete Device"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

