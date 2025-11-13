import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaExclamationTriangle } from "react-icons/fa";
import { getCurrentUser, getDashboardPath } from "@/lib/auth-helpers";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const dashboardPath = user ? getDashboardPath(user.role) : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive">
            <FaExclamationTriangle className="h-8 w-8 text-destructive-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold uppercase">
            ACCESS DENIED
          </CardTitle>
          <CardDescription>
            You do not have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button asChild className="w-full">
            <Link href={dashboardPath}>
              {user ? "GO TO DASHBOARD" : "GO TO LOGIN"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

