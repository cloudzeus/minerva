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
      messageId: response.messageId,
      recipients: alert.recipients.length,
    });

    return {
      success: true,
      emailsSent: alert.recipients.length,
      messageId: response.messageId,
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
  const alertIcon = isMinAlert ? "❄️" : "🔥";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Temperature Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      ${alertIcon} Temperature Alert
    </h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
      MINERVA Device Monitoring System
    </p>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="background: #fef2f2; border-left: 4px solid ${alertColor}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${alertColor};">
        ⚠️ Temperature ${isMinAlert ? "Too Low" : "Too High"}
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-weight: bold; color: #64748b;">Device:</td>
        <td style="padding: 12px 0;">${alert.deviceName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-weight: bold; color: #64748b;">Device ID:</td>
        <td style="padding: 12px 0; font-family: monospace; font-size: 12px;">${alert.deviceId}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-weight: bold; color: #64748b;">Current Temperature:</td>
        <td style="padding: 12px 0; font-size: 20px; font-weight: bold; color: ${alertColor};">
          ${alert.currentTemperature.toFixed(1)}°C
        </td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; font-weight: bold; color: #64748b;">Threshold Range:</td>
        <td style="padding: 12px 0;">
          ${alert.minThreshold.toFixed(1)}°C - ${alert.maxThreshold.toFixed(1)}°C
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-weight: bold; color: #64748b;">Time:</td>
        <td style="padding: 12px 0;">${alert.timestamp.toLocaleString()}</td>
      </tr>
    </table>

    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        💡 <strong>Action Required:</strong> Please check the device and take appropriate action if necessary.
      </p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        This is an automated alert from MINERVA Device Monitoring System.
        <br>
        To manage alert settings, log in to your dashboard.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

