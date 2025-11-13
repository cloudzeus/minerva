import { MilesightWebhookEvent } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { FaCircle } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";

interface RecentWebhookEventsProps {
  events: MilesightWebhookEvent[];
}

const eventColors: Record<string, string> = {
  "device.online": "text-green-500",
  "device.offline": "text-red-500",
  "alarm.triggered": "text-orange-500",
  "test.webhook": "text-blue-500",
};

export function RecentWebhookEvents({ events }: RecentWebhookEventsProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        No events received yet. Configure the webhook URL in Milesight platform.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase">Event Type</TableHead>
          <TableHead className="text-xs uppercase">Device ID</TableHead>
          <TableHead className="text-xs uppercase">Device Name</TableHead>
          <TableHead className="text-xs uppercase">Status</TableHead>
          <TableHead className="text-xs uppercase">Received At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="text-xs">
              <div className="flex items-center gap-2">
                <FaCircle
                  className={`h-2 w-2 ${
                    eventColors[event.eventType] || "text-gray-500"
                  }`}
                />
                <span className="font-mono">{event.eventType}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs font-mono">{event.deviceId || "—"}</TableCell>
            <TableCell className="text-xs">{event.deviceName || "—"}</TableCell>
            <TableCell>
              {event.processed ? (
                <Badge variant="default" className="text-xs">
                  Processed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDateTime(event.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

