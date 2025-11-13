import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

// Define route access control
const roleRoutes: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/admin", roles: [Role.ADMIN] },
  { prefix: "/manager", roles: [Role.MANAGER, Role.ADMIN] },
  { prefix: "/employee", roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN] },
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isAuthRoute = nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = nextUrl.pathname === "/unauthorized";

  // Allow API auth routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // If logged in and trying to access login, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    const redirectPath =
      userRole === Role.ADMIN
        ? "/admin"
        : userRole === Role.MANAGER
        ? "/manager"
        : "/employee";
    return NextResponse.redirect(new URL(redirectPath, nextUrl));
  }

  // Check if route requires authentication
  const protectedRoute = roleRoutes.find((route) =>
    nextUrl.pathname.startsWith(route.prefix)
  );

  if (protectedRoute) {
    // Not logged in - redirect to login
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in but wrong role - redirect to unauthorized or their dashboard
    if (userRole && !protectedRoute.roles.includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }
  }

  // Redirect root to appropriate dashboard
  if (nextUrl.pathname === "/" && isLoggedIn && userRole) {
    const redirectPath =
      userRole === Role.ADMIN
        ? "/admin"
        : userRole === Role.MANAGER
        ? "/manager"
        : "/employee";
    return NextResponse.redirect(new URL(redirectPath, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

