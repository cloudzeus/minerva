import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { AppSidebarNew } from "@/components/app-sidebar-new";
import { UserMenu } from "@/components/user-menu";
import { RealtimeIndicator } from "@/components/realtime-indicator";
import { headers } from "next/headers";

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole: Role | Role[];
}

export async function DashboardLayout({
  children,
  requiredRole,
}: DashboardLayoutProps) {
  const user = await requireRole(requiredRole);
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebarNew role={user.role} currentPath={pathname} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6">
          <div className="ml-12 flex items-center gap-3 md:ml-0">
            <h2 className="text-sm font-semibold md:text-base">
              Welcome back, {user.name || user.email}
            </h2>
            <RealtimeIndicator />
          </div>
          <UserMenu user={user} />
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

