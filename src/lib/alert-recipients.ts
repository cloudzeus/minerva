/**
 * Alert recipient resolution: who receives device/telemetry alerts.
 * Uses the same email config (SMTP/nodemailer) – recipients are app users (ADMIN).
 */

import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Returns email addresses of active ADMIN users who should receive system alerts
 * (device offline, telemetry recovery, offline device list from admin action).
 * Uses the User table; all alerts are sent via the configured SMTP in lib/email.
 */
export async function getAlertRecipientEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { email: true },
  });
  const emails = users.map((u) => u.email).filter((e) => e && e.includes("@"));
  return [...new Set(emails)];
}
