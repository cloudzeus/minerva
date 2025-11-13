import { User } from "@prisma/client";
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
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

interface TeamMembersTableProps {
  members: (User & { _count: { activityLogs: number } })[];
}

export function TeamMembersTable({ members }: TeamMembersTableProps) {
  if (members.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase">NAME</TableHead>
          <TableHead className="text-xs uppercase">EMAIL</TableHead>
          <TableHead className="text-xs uppercase">STATUS</TableHead>
          <TableHead className="text-xs uppercase">ACTIVITIES</TableHead>
          <TableHead className="text-xs uppercase">LAST LOGIN</TableHead>
          <TableHead className="text-xs uppercase">JOINED</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="text-xs font-medium">{member.name || "—"}</TableCell>
            <TableCell className="text-xs">{member.email}</TableCell>
            <TableCell>
              {member.isActive ? (
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
            <TableCell className="text-xs">{member._count.activityLogs}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {member.lastLoginAt
                ? formatDateTime(member.lastLoginAt)
                : "Never"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDateTime(member.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

