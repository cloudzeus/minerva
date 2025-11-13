import { MilesightDeviceTelemetry } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FaCircle, FaThermometerHalf, FaTint, FaBatteryHalf } from "react-icons/fa";

interface DeviceTelemetryTableProps {
  telemetryData: MilesightDeviceTelemetry[];
}

export function DeviceTelemetryTable({ telemetryData }: DeviceTelemetryTableProps) {
  if (telemetryData.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        No telemetry data received yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase">Timestamp</TableHead>
          <TableHead className="text-xs uppercase">Type</TableHead>
          <TableHead className="text-xs uppercase">Temperature</TableHead>
          <TableHead className="text-xs uppercase">Humidity</TableHead>
          <TableHead className="text-xs uppercase">Battery</TableHead>
          <TableHead className="text-xs uppercase">Other Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {telemetryData.map((telemetry) => {
          const sensorData = telemetry.sensorData
            ? JSON.parse(telemetry.sensorData)
            : {};
          
          return (
            <TableRow key={telemetry.id}>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(new Date(Number(telemetry.dataTimestamp)))}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {telemetry.dataType}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {telemetry.temperature !== null ? (
                  <div className="flex items-center gap-1">
                    <FaThermometerHalf className="h-3 w-3 text-orange-500" />
                    <span className="font-mono">{telemetry.temperature.toFixed(1)}°C</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {telemetry.humidity !== null ? (
                  <div className="flex items-center gap-1">
                    <FaTint className="h-3 w-3 text-blue-500" />
                    <span className="font-mono">{telemetry.humidity.toFixed(1)}%</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {telemetry.battery !== null ? (
                  <div className="flex items-center gap-1">
                    <FaBatteryHalf className="h-3 w-3 text-green-500" />
                    <span className="font-mono">{telemetry.battery}%</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {Object.keys(sensorData).length > 0 ? (
                  <details>
                    <summary className="cursor-pointer text-primary hover:underline">
                      {Object.keys(sensorData).length} fields
                    </summary>
                    <pre className="mt-2 max-w-md overflow-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(sensorData, null, 2)}
                    </pre>
                  </details>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

