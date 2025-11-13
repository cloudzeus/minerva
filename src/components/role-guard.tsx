import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { hasRole } from "@/lib/auth-helpers";

interface RoleGuardProps {
  allowedRoles: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export async function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const user = await getCurrentUser();

  if (!user || !hasRole(user.role, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

