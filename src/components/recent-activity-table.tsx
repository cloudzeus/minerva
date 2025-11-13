import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleBadge } from "@/components/role-badge";
import { formatDateTime } from "@/lib/utils";
import { ActivityLog, User } from "@prisma/client";
import { FaCircle } from "react-icons/fa";

interface RecentActivityTableProps {
  activities: (ActivityLog & { user: User })[];
}

const activityColors: Record<string, string> = {
  LOGIN: "text-green-500",
  LOGOUT: "text-gray-500",
  USER_CREATED: "text-blue-500",
  USER_UPDATED: "text-yellow-500",
  USER_DELETED: "text-red-500",
  PASSWORD_CHANGED: "text-purple-500",
  ROLE_CHANGED: "text-orange-500",
  PROFILE_UPDATED: "text-cyan-500",
};

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase">TYPE</TableHead>
          <TableHead className="text-xs uppercase">USER</TableHead>
          <TableHead className="text-xs uppercase">ROLE</TableHead>
          <TableHead className="text-xs uppercase">DESCRIPTION</TableHead>
          <TableHead className="text-xs uppercase">DATE</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <TableRow key={activity.id}>
            <TableCell className="text-xs">
              <div className="flex items-center gap-2">
                <FaCircle
                  className={`h-2 w-2 ${
                    activityColors[activity.type] || "text-gray-500"
                  }`}
                />
                <span className="font-medium">{activity.type}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs">{activity.user.name || activity.user.email}</TableCell>
            <TableCell>
              <RoleBadge role={activity.user.role} />
            </TableCell>
            <TableCell className="max-w-md truncate text-xs">
              {activity.description}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDateTime(activity.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

