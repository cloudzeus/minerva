import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

/**
 * Get the current authenticated user session
 * Returns null if not authenticated or if session JWT is invalid (e.g. AUTH_SECRET rotated).
 */
export async function getCurrentUser() {
  try {
    const session = await auth();
    return session?.user ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const causeMessage =
      error && typeof error === "object" && "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : "";
    const isInvalidSession =
      message.includes("no matching decryption secret") ||
      message.includes("JWTSessionError") ||
      causeMessage.includes("no matching decryption secret") ||
      (error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "JWTSessionError");
    if (isInvalidSession) {
      return null;
    }
    throw error;
  }
}

/**
 * Require user to be authenticated
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require user to have specific role(s)
 * Redirects to login if not authenticated
 * Redirects to unauthorized page if role doesn't match
 */
export async function requireRole(allowedRoles: Role | Role[]) {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  if (!roles.includes(user.role)) {
    redirect("/unauthorized");
  }
  
  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(userRole: Role, allowedRoles: Role | Role[]): boolean {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
}

/**
 * Get dashboard path for user based on role
 */
export function getDashboardPath(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.MANAGER:
      return "/manager";
    case Role.EMPLOYEE:
      return "/employee";
    default:
      return "/";
  }
}

