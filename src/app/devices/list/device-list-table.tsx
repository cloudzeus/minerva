"use client";

import { MilesightDeviceCache } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { createDeviceColumns } from "./columns";

interface DeviceWithTelemetry extends MilesightDeviceCache {
  _count: {
    telemetryData: number;
  };
}

interface DeviceListTableProps {
  devices: DeviceWithTelemetry[];
}

export function DeviceListTable({ devices }: DeviceListTableProps) {
  const router = useRouter();

  const handleViewDetails = (deviceId: string) => {
    router.push(`/devices/${deviceId}`);
  };

  const columns = createDeviceColumns(handleViewDetails);

  return <DataTable columns={columns} data={devices} />;
}

