"use server";

/**
 * Send test email – ADMIN only
 */

import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { sendTestEmail as sendTestEmailService } from "@/lib/email";
import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email address");

export async function sendTestEmailAction(to: string): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  await requireRole(Role.ADMIN);

  const parsed = emailSchema.safeParse(to.trim());
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid email" };
  }

  const result = await sendTestEmailService(parsed.data);
  if (result.success) {
    return { success: true, message: "Test email sent successfully." };
  }
  return { success: false, error: result.error };
}
