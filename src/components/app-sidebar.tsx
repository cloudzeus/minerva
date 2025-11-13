import Link from "next/link";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  FaChartLine,
  FaUsers,
  FaTasks,
  FaClipboardList,
  FaHome,
} from "react-icons/fa";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface AppSidebarProps {
  role: Role;
  currentPath: string;
}

export function AppSidebar({ role, currentPath }: AppSidebarProps) {
  const links: Record<Role, SidebarLink[]> = {
    [Role.ADMIN]: [
      {
        href: "/admin",
        label: "DASHBOARD",
        icon: FaHome,
        iconColor: "text-blue-500",
      },
      {
        href: "/admin/users",
        label: "USER MANAGEMENT",
        icon: FaUsers,
        iconColor: "text-green-500",
      },
      {
        href: "/admin/activity",
        label: "ACTIVITY LOGS",
        icon: FaClipboardList,
        iconColor: "text-purple-500",
      },
    ],
    [Role.MANAGER]: [
      {
        href: "/manager",
        label: "DASHBOARD",
        icon: FaHome,
        iconColor: "text-blue-500",
      },
      {
        href: "/manager/team",
        label: "TEAM",
        icon: FaUsers,
        iconColor: "text-green-500",
      },
      {
        href: "/manager/reports",
        label: "REPORTS",
        icon: FaChartLine,
        iconColor: "text-orange-500",
      },
    ],
    [Role.EMPLOYEE]: [
      {
        href: "/employee",
        label: "DASHBOARD",
        icon: FaHome,
        iconColor: "text-blue-500",
      },
      {
        href: "/employee/tasks",
        label: "MY TASKS",
        icon: FaTasks,
        iconColor: "text-green-500",
      },
      {
        href: "/employee/activity",
        label: "MY ACTIVITY",
        icon: FaClipboardList,
        iconColor: "text-purple-500",
      },
    ],
  };

  const roleLinks = links[role];

  return (
    <aside className="w-64 bg-card shadow-md">
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold text-primary">MINERVA</h1>
          <p className="text-sm text-muted-foreground">RBAC System</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {roleLinks.map((link) => {
            const isActive = currentPath === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "" : link.iconColor)} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

