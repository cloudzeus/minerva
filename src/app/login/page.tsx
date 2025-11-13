import { redirect } from "next/navigation";
import { getCurrentUser, getDashboardPath } from "@/lib/auth-helpers";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <LoginForm />
    </div>
  );
}

