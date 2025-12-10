/**
 * Email notification service for temperature alerts using Brevo API
 */

import * as brevo from "@getbrevo/brevo";

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
 * Send temperature alert email via Brevo
 */
export async function sendTemperatureAlertEmail(alert: TemperatureAlertEmail) {
  try {
    const brevoApiKey = process.env.BREVO_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "alerts@minerva.wwa.gr";
    const fromName = process.env.BREVO_FROM_NAME || "MINERVA Alerts";

    if (!brevoApiKey) {
      console.error("[Email Service] BREVO_KEY not configured");
      return {
        success: false,
        error: "Email service not configured (missing BREVO_KEY)",
      };
    }

    console.log("[Email Service] Sending temperature alert via Brevo:", {
      deviceName: alert.deviceName,
      currentTemp: alert.currentTemperature,
      alertType: alert.alertType,
      recipients: alert.recipients,
    });

    // Initialize Brevo API
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    const subject = `🚨 Temperature Alert: ${alert.deviceName}`;
    const htmlContent = generateEmailBody(alert);

    // Prepare email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: fromName,
      email: fromEmail,
    };
    sendSmtpEmail.to = alert.recipients.map((email) => ({
      email,
      name: email.split("@")[0],
    }));

    // Send email via Brevo
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("[Email Service] ✅ Email sent successfully via Brevo:", {
      recipients: alert.recipients.length,
    });

    return {
      success: true,
      emailsSent: alert.recipients.length,
    };
  } catch (error: any) {
    console.error("[Email Service] Failed to send alert via Brevo:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
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
                      Please investigate this device immediately and take appropriate corrective action. Check the device location, environmental conditions, and ensure proper operation.
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
    const brevoApiKey = process.env.BREVO_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "alerts@minerva.wwa.gr";
    const fromName = process.env.BREVO_FROM_NAME || "MINERVA Alerts";

    if (!brevoApiKey) {
      console.error("[Email Service] BREVO_KEY not configured");
      return {
        success: false,
        error: "Email service not configured (missing BREVO_KEY)",
      };
    }

    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

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

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: fromName,
      email: fromEmail,
    };
    sendSmtpEmail.to = alert.recipients.map((email) => ({
      email,
      name: email.split("@")[0],
    }));

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("[Email Service] ✅ Offline alert sent via Brevo");
    return { success: true };
  } catch (error: any) {
    console.error("[Email Service] Failed to send offline alert:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
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
    const brevoApiKey = process.env.BREVO_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "alerts@minerva.wwa.gr";
    const fromName = process.env.BREVO_FROM_NAME || "MINERVA Alerts";

    if (!brevoApiKey) {
      console.error("[Email Service] BREVO_KEY not configured");
      return {
        success: false,
        error: "Email service not configured (missing BREVO_KEY)",
      };
    }

    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

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

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: fromName,
      email: fromEmail,
    };
    sendSmtpEmail.to = alert.recipients.map((email) => ({
      email,
      name: email.split("@")[0],
    }));

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("[Email Service] ✅ Recovery alert sent via Brevo");
    return { success: true };
  } catch (error: any) {
    console.error("[Email Service] Failed to send recovery alert:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
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
  recipientEmail: string;
}

/**
 * Send offline device notification email via Brevo
 */
export async function sendOfflineDeviceNotificationEmail(
  notification: OfflineDeviceNotificationEmail
) {
  try {
    const brevoApiKey = process.env.BREVO_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "alerts@minerva.wwa.gr";
    const fromName = process.env.BREVO_FROM_NAME || "MINERVA Alerts";

    if (!brevoApiKey) {
      console.error("[Email Service] BREVO_KEY not configured");
      return {
        success: false,
        error: "Email service not configured (missing BREVO_KEY)",
      };
    }

    console.log("[Email Service] Sending offline device notification via Brevo:", {
      deviceCount: notification.devices.length,
      recipient: notification.recipientEmail,
    });

    // Initialize Brevo API
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    const subject = `⚠️ ${notification.devices.length} Device(s) Offline - MINERVA`;
    const htmlContent = generateOfflineDeviceEmailBody(notification);

    // Prepare email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: fromName,
      email: fromEmail,
    };
    sendSmtpEmail.to = [
      {
        email: notification.recipientEmail,
        name: notification.recipientEmail.split("@")[0],
      },
    ];

    // Send email via Brevo
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("[Email Service] ✅ Offline device notification sent successfully via Brevo");

    return {
      success: true,
      emailsSent: 1,
    };
  } catch (error: any) {
    console.error("[Email Service] Failed to send offline device notification via Brevo:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
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

