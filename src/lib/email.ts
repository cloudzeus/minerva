/**
 * Email notification service for alerts via Office 365 SMTP (noreply@aic.gr)
 *
 * Office 365 535 "Authentication unsuccessful" with an App Password usually means:
 * - SMTP AUTH is disabled for the mailbox. Admin must enable it:
 *   Microsoft 365 admin → Users → noreply@aic.gr → Mail → Manage email apps
 *   → turn ON "Authenticated SMTP". Or via Exchange admin center:
 *   Recipients → Mailboxes → noreply@aic.gr → Mailbox features → SMTP AUTH: Enabled.
 * - Security defaults may block legacy auth; tenant may need "SMTP AUTH" enabled.
 */

import nodemailer from "nodemailer";

const FROM_EMAIL = "noreply@aic.gr";
const FROM_NAME = "AIC No-Reply";

function getSmtpConfig() {
  const host = process.env.SMTP_SERVER;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return { host, port, user, pass };
}

async function sendViaSmtp(options: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: true; emailsSent: number } | { success: false; error: string }> {
  const config = getSmtpConfig();
  if (!config) {
    console.error("[Email Service] ❌ SMTP not configured (set SMTP_SERVER, SMTP_USER, SMTP_PASSWORD in .env)");
    return { success: false, error: "Email service not configured (missing SMTP settings)" };
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false, // TLS on 587
    auth: { user: config.user, pass: config.pass },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: options.to.join(", "),
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  return { success: true, emailsSent: options.to.length };
}

/**
 * Send a test email to a recipient (for Settings → Email Test).
 * Uses the same SMTP config as alert emails.
 */
export async function sendTestEmail(
  recipientEmail: string
): Promise<{ success: true } | { success: false; error: string }> {
  const subject = "MINERVA – Test email";
  const html =
    "<p>This is a <strong>test email</strong> from MINERVA.</p><p>If you received this, SMTP is working correctly.</p>";
  const text = "This is a test email from MINERVA. If you received this, SMTP is working correctly.";
  const result = await sendViaSmtp({
    to: [recipientEmail],
    subject,
    html,
    text,
  });
  return result.success ? { success: true } : result;
}

export interface TemperatureAlertEmail {
  deviceId: string;
  deviceName: string;
  currentTemperature: number;
  minThreshold: number;
  maxThreshold: number;
  alertType: "MIN" | "MAX";
  timestamp: Date;
  recipients: string[];
}

/**
 * Send temperature alert email via SMTP (noreply@aic.gr)
 */
export async function sendTemperatureAlertEmail(alert: TemperatureAlertEmail) {
  try {
    if (!alert.recipients || alert.recipients.length === 0) {
      console.error("[Email Service] ❌ No email recipients provided");
      return { success: false, error: "No email recipients provided" };
    }
    console.log("[Email Service] Sending temperature alert via SMTP:", {
      deviceName: alert.deviceName,
      currentTemp: alert.currentTemperature,
      alertType: alert.alertType,
      recipients: alert.recipients,
    });
    const subject = `🚨 Temperature Alert: ${alert.deviceName}`;
    const htmlContent = generateEmailBody(alert);
    const textBody = `Temperature Alert: ${alert.deviceName}\n\nCurrent Temperature: ${alert.currentTemperature.toFixed(1)}°C\nThreshold Range: ${alert.minThreshold.toFixed(1)}°C - ${alert.maxThreshold.toFixed(1)}°C\nAlert Type: ${alert.alertType === "MIN" ? "Temperature Too Low" : "Temperature Too High"}`;
    const result = await sendViaSmtp({
      to: alert.recipients,
      subject,
      html: htmlContent,
      text: textBody,
    });
    if (result.success) {
      console.log("[Email Service] ✅ Temperature alert sent via SMTP:", { recipients: alert.recipients.length });
    }
    return result.success ? { success: true, emailsSent: result.emailsSent } : result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Email Service] ❌ Failed to send temperature alert:", error);
    return { success: false, error: message };
  }
}

/**
 * Generate HTML email body for temperature alert
 */
function generateEmailBody(alert: TemperatureAlertEmail): string {
  const isMinAlert = alert.alertType === "MIN";
  const alertColor = isMinAlert ? "#3b82f6" : "#ef4444"; // Blue for cold, Red for hot
  const alertBgColor = isMinAlert ? "#eff6ff" : "#fef2f2"; // Light blue/red background
  const alertIcon = isMinAlert ? "❄️" : "🔥";
  const alertTitle = isMinAlert ? "Temperature Too Low" : "Temperature Too High";
  const alertMessage = isMinAlert 
    ? "The temperature has dropped below the minimum threshold." 
    : "The temperature has exceeded the maximum threshold.";

  // Calculate how much the temperature is out of range
  const difference = isMinAlert 
    ? (alert.minThreshold - alert.currentTemperature).toFixed(1)
    : (alert.currentTemperature - alert.maxThreshold).toFixed(1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Temperature Alert - ${alert.deviceName}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 10px !important;
      }
      .temperature-value {
        font-size: 32px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${alertIcon} Temperature Alert
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">
                MINERVA Device Monitoring System
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0;">
              <div style="background-color: ${alertBgColor}; border-left: 5px solid ${alertColor}; padding: 20px 30px; margin: 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${alertColor}; line-height: 1.4;">
                        ⚠️ ${alertTitle}
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                        ${alertMessage}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Temperature Display - Large and Prominent -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background-color: #f9fafb; border-radius: 10px; padding: 30px; border: 2px solid ${alertColor};">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Current Temperature
                    </p>
                    <p class="temperature-value" style="margin: 0; font-size: 48px; font-weight: 800; color: ${alertColor}; line-height: 1;">
                      ${alert.currentTemperature.toFixed(1)}°C
                    </p>
                    <p style="margin: 15px 0 0 0; font-size: 14px; color: #9ca3af;">
                      ${difference}°C ${isMinAlert ? "below" : "above"} threshold
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Device Information Table -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td colspan="2" style="padding: 0 0 15px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111827;">
                      Device Information
                    </p>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px; width: 40%;">
                    Device Name
                  </td>
                  <td style="padding: 14px 0; color: #111827; font-size: 14px; font-weight: 500;">
                    ${alert.deviceName}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Device ID
                  </td>
                  <td style="padding: 14px 0; color: #111827; font-size: 13px; font-family: 'Courier New', monospace;">
                    ${alert.deviceId}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Allowed Range
                  </td>
                  <td style="padding: 14px 0; color: #111827; font-size: 14px; font-weight: 500;">
                    ${alert.minThreshold.toFixed(1)}°C — ${alert.maxThreshold.toFixed(1)}°C
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Alert Time
                  </td>
                  <td style="padding: 14px 0; color: #111827; font-size: 14px;">
                    ${alert.timestamp.toLocaleString('en-US', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Required Box -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #92400e;">
                      💡 Action Required
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.6;">
                      Please investigate the environment temperature immediately and take appropriate corrective action. Check the environmental conditions and ensure the temperature is within acceptable limits.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                This is an automated alert from <strong>MINERVA Device Monitoring System</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                To manage alert settings or view device details, please log in to your dashboard.
              </p>
              <p style="margin: 15px 0 0 0; font-size: 11px; color: #d1d5db; text-align: center;">
                © ${new Date().getFullYear()} MINERVA. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export interface TemperatureAlertRecipientDisabledEmail {
  deviceName: string;
  recipientEmail: string;
  channelLabel?: string | null; // e.g. "CH1", "CH2", or null for single sensor
}

/**
 * Send email to a recipient notifying them they have been disabled from temperature alerts.
 */
export async function sendTemperatureAlertRecipientDisabledEmail(
  notification: TemperatureAlertRecipientDisabledEmail
) {
  try {
    const channelLabel = notification.channelLabel ? ` ${notification.channelLabel}` : "";
    const subject = `Temperature alerts disabled – ${notification.deviceName}${channelLabel}`;
    const htmlContent = generateRecipientDisabledEmailBody(notification);
    const textBody = `You have been disabled from receiving temperature alert notifications for device "${notification.deviceName}"${channelLabel}. You will no longer receive emails when temperature goes out of range.`;
    const result = await sendViaSmtp({
      to: [notification.recipientEmail],
      subject,
      html: htmlContent,
      text: textBody,
    });
    if (result.success) {
      console.log("[Email Service] ✅ Recipient disabled notification sent to", notification.recipientEmail);
    }
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Email Service] ❌ Failed to send recipient disabled notification:", error);
    return { success: false, error: message };
  }
}

function generateRecipientDisabledEmailBody(
  notification: TemperatureAlertRecipientDisabledEmail
): string {
  const channelLabel = notification.channelLabel ? ` (${notification.channelLabel})` : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Temperature alerts disabled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">
                🔕 Temperature alerts disabled
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">
                MINERVA Device Monitoring
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                You have been <strong>disabled from receiving temperature alert notifications</strong> for the following device:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                ${notification.deviceName}${channelLabel}
              </p>
              <p style="margin: 0 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                You will no longer receive emails when the temperature goes out of range for this device. To receive alerts again, an administrator must re-enable notifications for your email address in the device alert settings.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                This is an automated message from MINERVA Device Monitoring System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

interface DeviceOfflineAlertEmail {
  deviceName: string;
  serialNumber?: string | null;
  devEui?: string | null;
  minutesSinceLast: number;
  recipients: string[];
}

export async function sendDeviceOfflineAlertEmail(
  alert: DeviceOfflineAlertEmail
) {
  try {
    const subject = `⚠️ No Telemetry from ${alert.deviceName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #b91c1c; margin-bottom: 12px;">No Telemetry Detected</h2>
        <p style="margin-bottom: 12px;">
          We have not received any telemetry from <strong>${alert.deviceName}</strong> for the
          last <strong>${alert.minutesSinceLast} minutes</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; width: 120px; color: #6b7280;">Serial Number:</td>
            <td style="padding: 6px 0;">${alert.serialNumber || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">DevEUI:</td>
            <td style="padding: 6px 0; font-family: 'Courier New', monospace;">
              ${alert.devEui || "—"}
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 8px 0; color: #374151;">
          The system attempted to fetch the latest telemetry directly from Milesight Console
          and store it locally.
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
          This is an automated message from the MINERVA Device Monitoring System.
        </p>
      </div>
    `;
    const result = await sendViaSmtp({ to: alert.recipients, subject, html: htmlContent });
    if (result.success) console.log("[Email Service] ✅ Offline alert sent via SMTP");
    return result.success ? { success: true } : result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Email Service] ❌ Failed to send offline alert:", error);
    return { success: false, error: message };
  }
}

interface DeviceRecoveryAlertEmail {
  deviceName: string;
  serialNumber?: string | null;
  devEui?: string | null;
  recipients: string[];
}

export async function sendDeviceRecoveryEmail(alert: DeviceRecoveryAlertEmail) {
  try {
    const subject = `✅ Telemetry Resumed: ${alert.deviceName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #16a34a; margin-bottom: 12px;">Telemetry Flow Restored</h2>
        <p style="margin-bottom: 12px;">
          The MINERVA webhook has resumed receiving data from
          <strong>${alert.deviceName}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; width: 120px; color: #6b7280;">Serial Number:</td>
            <td style="padding: 6px 0;">${alert.serialNumber || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">DevEUI:</td>
            <td style="padding: 6px 0; font-family: 'Courier New', monospace;">
              ${alert.devEui || "—"}
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 8px 0; color: #374151;">
          Manual console backfill has been halted for this device.
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
          This is an automated message from the MINERVA Device Monitoring System.
        </p>
      </div>
    `;
    const result = await sendViaSmtp({ to: alert.recipients, subject, html: htmlContent });
    if (result.success) console.log("[Email Service] ✅ Recovery alert sent via SMTP");
    return result.success ? { success: true } : result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Email Service] ❌ Failed to send recovery alert:", error);
    return { success: false, error: message };
  }
}

export interface OfflineDeviceInfo {
  deviceId: string;
  name: string;
  sn: string;
  deviceType: string;
  lastSyncAt: Date;
}

export interface OfflineDeviceNotificationEmail {
  devices: OfflineDeviceInfo[];
  /** Recipient emails (e.g. from getAlertRecipientEmails()). Sent via same SMTP config. */
  recipients: string[];
}

/**
 * Send offline device notification email via SMTP (noreply@aic.gr).
 * Alerts are sent to the given recipients using the configured email (nodemailer).
 */
export async function sendOfflineDeviceNotificationEmail(
  notification: OfflineDeviceNotificationEmail
) {
  try {
    if (!notification.recipients?.length) {
      console.warn("[Email Service] No recipients for offline device notification");
      return { success: false, error: "No recipients configured" };
    }
    console.log("[Email Service] Sending offline device notification via SMTP:", {
      deviceCount: notification.devices.length,
      recipientCount: notification.recipients.length,
    });
    const subject = `⚠️ ${notification.devices.length} Device(s) Offline - MINERVA`;
    const htmlContent = generateOfflineDeviceEmailBody(notification);
    const result = await sendViaSmtp({
      to: notification.recipients,
      subject,
      html: htmlContent,
    });
    if (result.success) {
      console.log("[Email Service] ✅ Offline device notification sent via SMTP");
    }
    return result.success ? { success: true, emailsSent: result.emailsSent } : result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Email Service] ❌ Failed to send offline device notification:", error);
    return { success: false, error: message };
  }
}

/**
 * Generate HTML email body for offline device notification
 */
function generateOfflineDeviceEmailBody(notification: OfflineDeviceNotificationEmail): string {
  const deviceCount = notification.devices.length;
  const isPlural = deviceCount > 1;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Offline Device Alert - MINERVA</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 10px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ⚠️ Device Offline Alert
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">
                MINERVA Device Monitoring System
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0;">
              <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 20px 30px; margin: 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ef4444; line-height: 1.4;">
                        ${deviceCount} Device${isPlural ? "s" : ""} Currently Offline
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                        The following device${isPlural ? "s have" : " has"} lost connection to the Milesight platform.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Device List -->
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td colspan="3" style="padding: 0 0 15px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111827;">
                      Offline Devices
                    </p>
                  </td>
                </tr>
                ${notification.devices
                  .map(
                    (device, index) => `
                <tr style="border-bottom: ${index < notification.devices.length - 1 ? "1px solid #e5e7eb;" : "none;"}">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px; width: 30%;">
                    Device Name
                  </td>
                  <td colspan="2" style="padding: 14px 0; color: #111827; font-size: 14px; font-weight: 500;">
                    ${device.name}
                  </td>
                </tr>
                <tr style="border-bottom: ${index < notification.devices.length - 1 ? "1px solid #e5e7eb;" : "none;"}">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Serial Number
                  </td>
                  <td colspan="2" style="padding: 14px 0; color: #111827; font-size: 14px; font-family: monospace;">
                    ${device.sn}
                  </td>
                </tr>
                <tr style="border-bottom: ${index < notification.devices.length - 1 ? "1px solid #e5e7eb;" : "none;"}">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Device Type
                  </td>
                  <td colspan="2" style="padding: 14px 0; color: #111827; font-size: 14px;">
                    ${device.deviceType}
                  </td>
                </tr>
                <tr style="border-bottom: ${index < notification.devices.length - 1 ? "1px solid #e5e7eb;" : "none;"}">
                  <td style="padding: 14px 0; font-weight: 600; color: #6b7280; font-size: 14px;">
                    Last Sync
                  </td>
                  <td colspan="2" style="padding: 14px 0; color: #111827; font-size: 14px;">
                    ${new Date(device.lastSyncAt).toLocaleString()}
                  </td>
                </tr>
                ${index < notification.devices.length - 1 ? '<tr><td colspan="3" style="padding: 10px 0;"></td></tr>' : ""}
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                This is an automated notification from MINERVA Device Monitoring System.<br>
                Please check the device connection and Milesight platform status.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
