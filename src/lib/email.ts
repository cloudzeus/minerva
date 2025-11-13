/**
 * Email notification service for temperature alerts
 * TODO: Configure SMTP settings in environment variables
 */

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
 * Send temperature alert email
 */
export async function sendTemperatureAlertEmail(alert: TemperatureAlertEmail) {
  try {
    console.log("[Email Service] Sending temperature alert:", {
      deviceName: alert.deviceName,
      currentTemp: alert.currentTemperature,
      alertType: alert.alertType,
      recipients: alert.recipients,
    });

    // TODO: Implement actual email sending using nodemailer or similar
    // For now, we'll log the alert and prepare the email content
    
    const subject = `🚨 Temperature Alert: ${alert.deviceName}`;
    const message = generateEmailBody(alert);

    // If you have SMTP configured, uncomment and configure this:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'alerts@minerva.com',
      to: alert.recipients.join(', '),
      subject,
      html: message,
    });
    */

    console.log("[Email Service] Email prepared:", {
      subject,
      to: alert.recipients.join(", "),
      preview: message.substring(0, 100),
    });

    return {
      success: true,
      emailsSent: alert.recipients.length,
    };
  } catch (error: any) {
    console.error("[Email Service] Failed to send alert:", error);
    return {
      success: false,
      error: error.message,
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

