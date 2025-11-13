import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getDashboardPath } from "@/lib/auth-helpers";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  redirect("/login");
}

