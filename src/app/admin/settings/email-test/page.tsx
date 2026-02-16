/**
 * Email Test Settings Page
 * ADMIN-ONLY: Send a test email via nodemailer (SMTP)
 */

import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaEnvelope } from "react-icons/fa";
import { EmailTestSection } from "./email-test-section";

export const dynamic = "force-dynamic";

export default async function EmailTestSettingsPage() {
  return (
    <DashboardLayout requiredRole={Role.ADMIN}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">Email test</h1>
          <p className="text-xs text-muted-foreground">
            Send a test email to verify SMTP (nodemailer) configuration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaEnvelope className="h-4 w-4 text-blue-500" />
              Send test email
            </CardTitle>
            <CardDescription className="text-xs">
              Open the test dialog to enter a recipient and send a test message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailTestSection />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
