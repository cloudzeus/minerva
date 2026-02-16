"use client";

import { useState } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  FaChartLine,
  FaUsers,
  FaTasks,
  FaClipboardList,
  FaHome,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaChevronRight,
  FaUserPlus,
  FaUserEdit,
  FaHistory,
  FaCog,
  FaKey,
  FaWifi,
  FaMicrochip,
  FaDatabase,
  FaList,
  FaEnvelope,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  links: SidebarLink[];
}

interface AppSidebarProps {
  role: Role;
  currentPath: string;
}

export function AppSidebarNew({ role, currentPath }: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["user-management"])
  );

  const toggleGroup = (groupLabel: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupLabel)) {
      newExpanded.delete(groupLabel);
    } else {
      newExpanded.add(groupLabel);
    }
    setExpandedGroups(newExpanded);
  };

  const menuStructure: Record<
    Role,
    { links: SidebarLink[]; groups: MenuGroup[] }
  > = {
    [Role.ADMIN]: {
      links: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: FaHome,
          iconColor: "text-blue-500",
        },
      ],
      groups: [
        {
          label: "User Management",
          icon: FaUsers,
          iconColor: "text-green-500",
          links: [
            {
              href: "/admin/users",
              label: "All Users",
              icon: FaUsers,
              iconColor: "text-green-500",
            },
            {
              href: "/admin/users?action=create",
              label: "Create User",
              icon: FaUserPlus,
              iconColor: "text-blue-500",
            },
          ],
        },
        {
          label: "Activity",
          icon: FaClipboardList,
          iconColor: "text-purple-500",
          links: [
            {
              href: "/admin/activity",
              label: "Activity Logs",
              icon: FaHistory,
              iconColor: "text-purple-500",
            },
          ],
        },
        {
          label: "Device Data",
          icon: FaDatabase,
          iconColor: "text-cyan-500",
          links: [
            {
              href: "/devices/list",
              label: "Device List",
              icon: FaList,
              iconColor: "text-cyan-500",
            },
          ],
        },
        {
          label: "Settings",
          icon: FaCog,
          iconColor: "text-orange-500",
          links: [
            {
              href: "/admin/settings/milesight",
              label: "Milesight Auth",
              icon: FaKey,
              iconColor: "text-cyan-500",
            },
            {
              href: "/admin/settings/milesight-webhook",
              label: "Milesight Webhook",
              icon: FaWifi,
              iconColor: "text-teal-500",
            },
            {
              href: "/admin/settings/email-test",
              label: "Email Test",
              icon: FaEnvelope,
              iconColor: "text-blue-500",
            },
            {
              href: "/admin/devices/milesight",
              label: "Device Management",
              icon: FaMicrochip,
              iconColor: "text-indigo-500",
            },
          ],
        },
      ],
    },
    // MANAGER and EMPLOYEE roles DO NOT have access to Settings
    [Role.MANAGER]: {
      links: [
        {
          href: "/manager",
          label: "Dashboard",
          icon: FaHome,
          iconColor: "text-blue-500",
        },
      ],
      groups: [
        {
          label: "Team",
          icon: FaUsers,
          iconColor: "text-green-500",
          links: [
            {
              href: "/manager/team",
              label: "Team Members",
              icon: FaUsers,
              iconColor: "text-green-500",
            },
            {
              href: "/manager/reports",
              label: "Reports",
              icon: FaChartLine,
              iconColor: "text-orange-500",
            },
          ],
        },
        {
          label: "Device Data",
          icon: FaDatabase,
          iconColor: "text-cyan-500",
          links: [
            {
              href: "/devices/list",
              label: "Device List",
              icon: FaList,
              iconColor: "text-cyan-500",
            },
          ],
        },
      ],
    },
    [Role.EMPLOYEE]: {
      links: [
        {
          href: "/employee",
          label: "Dashboard",
          icon: FaHome,
          iconColor: "text-blue-500",
        },
      ],
      groups: [
        {
          label: "My Work",
          icon: FaTasks,
          iconColor: "text-green-500",
          links: [
            {
              href: "/employee/tasks",
              label: "My Tasks",
              icon: FaTasks,
              iconColor: "text-green-500",
            },
            {
              href: "/employee/activity",
              label: "My Activity",
              icon: FaClipboardList,
              iconColor: "text-purple-500",
            },
          ],
        },
        {
          label: "Device Data",
          icon: FaDatabase,
          iconColor: "text-cyan-500",
          links: [
            {
              href: "/devices/list",
              label: "Device List",
              icon: FaList,
              iconColor: "text-cyan-500",
            },
          ],
        },
      ],
    },
  };

  const { links, groups } = menuStructure[role];

  const SidebarContent = () => (
    <>
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className={cn("overflow-hidden transition-all", isOpen ? "w-full" : "w-0")}>
            <img 
              src="https://wwa-espa.b-cdn.net/crm/minervaLogo.png" 
              alt="MINERVA" 
              className="h-[68px] w-auto"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => {
          const isActive = currentPath === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "" : link.iconColor)} />
              <span className={cn("transition-all", isOpen ? "opacity-100" : "opacity-0 md:hidden")}>
                {link.label}
              </span>
            </Link>
          );
        })}

        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const GroupIcon = group.icon;
          
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <GroupIcon className={cn("h-4 w-4 flex-shrink-0", group.iconColor)} />
                  <span className={cn("transition-all", isOpen ? "opacity-100" : "opacity-0 md:hidden")}>
                    {group.label}
                  </span>
                </div>
                {isOpen && (
                  isExpanded ? (
                    <FaChevronDown className="h-3 w-3" />
                  ) : (
                    <FaChevronRight className="h-3 w-3" />
                  )
                )}
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                  {group.links.map((link) => {
                    const isActive = currentPath === link.href.split("?")[0];
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-3 w-3 flex-shrink-0", isActive ? "" : link.iconColor)} />
                        <span className={cn("transition-all", isOpen ? "opacity-100" : "opacity-0 md:hidden")}>
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <FaBars className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card shadow-md transition-transform md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col bg-card shadow-md transition-all duration-300",
          isOpen ? "md:w-64" : "md:w-16"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

