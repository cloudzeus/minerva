import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { FaCrown, FaUserTie, FaUser } from "react-icons/fa";

interface RoleBadgeProps {
  role: Role;
  showIcon?: boolean;
}

export function RoleBadge({ role, showIcon = true }: RoleBadgeProps) {
  const config = {
    [Role.ADMIN]: {
      label: "Admin",
      variant: "default" as const,
      icon: FaCrown,
      color: "text-yellow-500",
    },
    [Role.MANAGER]: {
      label: "Manager",
      variant: "secondary" as const,
      icon: FaUserTie,
      color: "text-blue-500",
    },
    [Role.EMPLOYEE]: {
      label: "Employee",
      variant: "outline" as const,
      icon: FaUser,
      color: "text-green-500",
    },
  };

  const { label, variant, icon: Icon, color } = config[role];

  return (
    <Badge variant={variant} className="gap-1.5">
      {showIcon && <Icon className={color} />}
      {label}
    </Badge>
  );
}

