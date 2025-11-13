# Temperature Alert System

## Overview

The MINERVA system includes an automated temperature alert system that monitors device sensors and sends professional HTML-formatted email notifications when temperature thresholds are exceeded.

## Features

### 🎯 Core Functionality

1. **Real-time Monitoring**: Continuously monitors all temperature sensors from Milesight devices
2. **Dual Threshold Detection**: Alerts for both minimum and maximum temperature violations
3. **Professional HTML Emails**: Beautifully formatted, mobile-responsive email notifications
4. **Cooldown Period**: Prevents email spam with configurable alert cooldown
5. **Multi-recipient Support**: Send alerts to multiple email addresses
6. **Device-specific Settings**: Configure different thresholds for each device

### 📧 Email Features

The alert emails include:
- **Eye-catching design** with gradient headers and color-coded alerts
- **Large temperature display** showing current reading in prominent style
- **Threshold information** with exact min/max ranges
- **Difference calculation** showing how far out of range the temperature is
- **Device details** including name, ID, and timestamp
- **Action guidance** with clear next steps
- **Mobile responsive** design that works on all devices
- **Professional branding** with MINERVA logo and footer

### 🎨 Visual Design

- **❄️ Blue theme** for "Too Low" alerts (temperature below minimum)
- **🔥 Red theme** for "Too High" alerts (temperature above maximum)
- **Gradient headers** using purple-to-violet color scheme
- **Clean typography** with system fonts for cross-platform compatibility
- **Professional layout** using HTML tables for maximum email client compatibility

## How It Works

### 1. Configuration (Admin/Manager)

Admins and Managers can configure temperature alerts through the device settings:

1. Navigate to **Admin → Devices → Milesight Devices**
2. Select a device
3. Configure alert settings:
   - **Enable/Disable** alerts
   - **Minimum Temperature** threshold (°C)
   - **Maximum Temperature** threshold (°C)
   - **Email Recipients** (multiple addresses supported)
   - **Alert Cooldown** period (default: 300 seconds / 5 minutes)

### 2. Monitoring Process

```
Device Sensor → Webhook → Alert Check → Email Notification
     ↓              ↓            ↓              ↓
Temperature    Milesight    Compare       Send HTML
   Reading      Webhook    Thresholds       Email
```

When a device sends temperature data:

1. **Data Reception**: Webhook receives telemetry from Milesight platform
2. **Device Validation**: Checks if device is registered in system
3. **Telemetry Storage**: Saves sensor data to database
4. **Alert Check**: Automatically checks if temperature exceeds thresholds
5. **Cooldown Verification**: Ensures cooldown period has elapsed
6. **Email Dispatch**: Sends formatted alert via Brevo email service

### 3. Alert Triggering

An alert is triggered when:
- Temperature < Minimum Threshold ❄️ → "Too Low" alert
- Temperature > Maximum Threshold 🔥 → "Too High" alert

Alerts are **NOT** sent when:
- Alert is disabled for the device
- Still within cooldown period (prevents spam)
- Temperature is within acceptable range

## Email Service Configuration

### Required Environment Variables

```bash
# Brevo (formerly SendinBlue) API Configuration
BREVO_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=alerts@minerva.wwa.gr
BREVO_FROM_NAME=MINERVA Alerts
```

### Setting Up Brevo

1. Create account at [Brevo](https://www.brevo.com)
2. Generate API key from Settings → API Keys
3. Verify sender email address
4. Add credentials to environment variables
5. Test email delivery

## Database Schema

### TemperatureAlert Model

```prisma
model TemperatureAlert {
  id                String    @id @default(cuid())
  deviceId          String    @unique
  minTemperature    Float
  maxTemperature    Float
  emailRecipients   String    // JSON array of email addresses
  enabled           Boolean   @default(true)
  alertCooldown     Int       @default(300) // seconds
  lastAlertSentAt   DateTime?
  totalAlertsSent   Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

## API Reference

### Server Actions

#### `saveTemperatureAlert(settings)`
Save or update alert configuration for a device.

**Parameters:**
- `deviceId`: Device identifier
- `minTemperature`: Minimum threshold (°C)
- `maxTemperature`: Maximum threshold (°C)
- `emailRecipients`: Array of email addresses
- `enabled`: Enable/disable alerts
- `alertCooldown`: Cooldown period in seconds (optional, default: 300)

**Returns:**
```typescript
{
  success: boolean;
  alert?: TemperatureAlertSettings;
  error?: string;
}
```

#### `getTemperatureAlert(deviceId)`
Retrieve alert settings for a device.

#### `deleteTemperatureAlert(deviceId)`
Remove alert configuration for a device.

### Email Service

#### `sendTemperatureAlertEmail(alert)`
Send HTML-formatted temperature alert email.

**Parameters:**
```typescript
interface TemperatureAlertEmail {
  deviceId: string;
  deviceName: string;
  currentTemperature: number;
  minThreshold: number;
  maxThreshold: number;
  alertType: "MIN" | "MAX";
  timestamp: Date;
  recipients: string[];
}
```

## Example Alert Email

### High Temperature Alert 🔥

```
Subject: 🚨 Temperature Alert: Office Sensor

┌─────────────────────────────────────┐
│   🔥 Temperature Alert               │
│   MINERVA Device Monitoring System   │
└─────────────────────────────────────┘

⚠️ Temperature Too High
The temperature has exceeded the maximum threshold.

┌──────────────────────────────┐
│   Current Temperature         │
│        28.5°C                 │
│   3.5°C above threshold       │
└──────────────────────────────┘

Device Name:     Office Sensor
Device ID:       12345678
Allowed Range:   18.0°C — 25.0°C
Alert Time:      Wed, Nov 13, 2025, 11:30:45 AM

💡 Action Required
Please investigate this device immediately and take 
appropriate corrective action.
```

## Troubleshooting

### Emails Not Being Sent

1. **Check BREVO_KEY**: Ensure API key is configured
2. **Verify Recipients**: Validate email addresses are correct
3. **Check Alert Enabled**: Ensure alert is enabled for device
4. **Review Cooldown**: Check if still in cooldown period
5. **Check Logs**: Review console logs for errors

### Alerts Not Triggering

1. **Device Registration**: Ensure device is registered in system
2. **Webhook Active**: Verify webhook is enabled and receiving data
3. **Threshold Values**: Check min/max temperature settings are correct
4. **Temperature Data**: Confirm device is sending temperature readings

### Email Formatting Issues

The email uses HTML tables for maximum compatibility with email clients:
- Gmail ✅
- Outlook ✅
- Apple Mail ✅
- Mobile clients ✅

## Best Practices

### 1. Threshold Configuration
- Set realistic temperature ranges for your environment
- Consider seasonal variations
- Account for device location (indoor vs outdoor)

### 2. Recipient Management
- Use group email addresses for teams
- Include multiple contacts for redundancy
- Regularly review and update recipient lists

### 3. Cooldown Settings
- Default 5 minutes prevents spam
- Increase for stable environments
- Decrease for critical monitoring scenarios

### 4. Testing
- Test alerts with intentional threshold violations
- Verify all recipients receive emails
- Check email appearance in different clients

## Monitoring & Analytics

Track alert performance through:
- **Total Alerts Sent**: Counter in database
- **Last Alert Time**: Timestamp of most recent alert
- **Webhook Events**: Complete audit trail in database
- **Email Delivery**: Brevo dashboard analytics

## Security Considerations

- ✅ Only Admins and Managers can configure alerts
- ✅ Email credentials stored in environment variables
- ✅ Alert settings require authentication
- ✅ Webhook verification with tokens/secrets
- ✅ Database audit trail for all alerts

## Future Enhancements

Potential improvements:
- [ ] SMS/WhatsApp notifications
- [ ] Alert escalation policies
- [ ] Custom email templates
- [ ] Alert acknowledgment system
- [ ] Machine learning for predictive alerts
- [ ] Multi-language email support
- [ ] Alert statistics dashboard
- [ ] Integration with incident management systems

## Support

For issues or questions:
1. Check logs in Railway deployment
2. Review Brevo email delivery status
3. Verify environment variables are set correctly
4. Contact system administrator

---

**Last Updated**: November 13, 2025  
**Version**: 1.0.0  
**MINERVA Device Monitoring System**

