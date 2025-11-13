# Milesight Webhook Setup Guide

## 🎯 Overview

The Milesight Webhook feature allows your Minerva RBAC application to receive real-time event notifications from Milesight Development Platform for all your devices.

**IMPORTANT**: This feature is **ADMIN-ONLY**.

## 📋 Quick Setup (5 Steps)

### Step 1: Access Webhook Settings

1. Login as **ADMIN** user
2. In sidebar, navigate to: **Settings → Milesight Webhook**
3. You should see the webhook configuration page

### Step 2: Copy Webhook URL

On the webhook settings page:
- Find the "WEBHOOK CALLBACK URL" card
- Copy the full URL (there's a COPY button)
- Example: `http://localhost:3000/api/webhooks/milesight`
- If you set a verification token, it will include: `?token=your-token`

### Step 3: Configure in Milesight Platform

1. Login to **Milesight Development Platform**
2. Navigate to your **Application → Settings**
3. Find the **Webhook** or **Event Notification** section
4. Paste the copied URL into the **Callback URI** field
5. Save the settings in Milesight

### Step 4: Enable Webhook in Minerva

Back in Minerva:
1. Toggle "Enable Webhook" to **ON**
2. (Optional) Set a verification token for security
3. Click "SAVE SETTINGS"

### Step 5: Test the Webhook

1. Click "TEST WEBHOOK" button
2. This sends a test event to your endpoint
3. Check the "RECENT EVENTS" section
4. You should see a `test.webhook` event appear

## 🎨 Live Indicator Explained

The live indicator in the top-right shows webhook status:

### States:
- **Gray "Webhook Disabled"**: Webhook is turned off
- **Blue "Active"**: Webhook is enabled, waiting for events
- **Green Pulsing "Receiving Data"**: Event received in last 5 minutes
  - Pulses for 10 seconds after each event
  - Shows last event timestamp

## 📊 Webhook Events Table

The "RECENT EVENTS" table shows the last 10 events with:

| Column | Description |
|--------|-------------|
| **Event Type** | Type of event (device.online, alarm.triggered, etc.) |
| **Device ID** | Unique device identifier |
| **Device Name** | Human-readable device name |
| **Status** | Processed or Pending |
| **Received At** | When the event was received |

### Event Type Color Coding:
- 🟢 **device.online** - Green (device came online)
- 🔴 **device.offline** - Red (device went offline)
- 🟠 **alarm.triggered** - Orange (alarm event)
- 🔵 **test.webhook** - Blue (test event from settings)

## 🔐 Security Features

### Optional Verification Token
- Add a secret token in the settings
- Token is appended to webhook URL as query parameter
- Milesight must include this in the URL
- Webhook endpoint validates token before accepting events

### Security Measures:
✅ ADMIN-only access (multiple protection layers)
✅ Optional verification token for webhook calls
✅ All events logged for audit trail
✅ Server-side validation of payload
✅ Error logging and monitoring

## 🧪 Testing

### Option 1: Test from Settings Page
```
1. Go to Settings → Milesight Webhook
2. Click "TEST WEBHOOK" button
3. Check Recent Events table for test.webhook event
```

### Option 2: Test with curl
```bash
# Without token
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "device.online",
    "deviceId": "device-123",
    "deviceName": "Test Device",
    "timestamp": "2024-01-01T00:00:00Z"
  }'

# With verification token
curl -X POST http://localhost:3000/api/webhooks/milesight?token=your-token \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "alarm.triggered",
    "deviceId": "sensor-456",
    "deviceName": "Temperature Sensor",
    "alarmType": "high_temperature"
  }'
```

### Option 3: Health Check
```bash
curl http://localhost:3000/api/webhooks/milesight
```

Returns:
```json
{
  "status": "ok",
  "enabled": true,
  "endpoint": "/api/webhooks/milesight",
  "lastEvent": {
    "at": "2024-01-01T12:00:00Z",
    "type": "device.online",
    "totalCount": 42
  }
}
```

## 📈 Monitoring

### View Event Statistics:
- **Total Events Count**: Cumulative count of all events received
- **Last Event At**: Timestamp of most recent event
- **Last Event Type**: Type of the last event received

### Recent Events:
- View last 10 events in real-time
- Auto-refreshes when new events arrive
- Click "CLEAR EVENTS" to reset event history

## 🚨 Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Is webhook enabled in Minerva settings?
2. Is the correct URL configured in Milesight platform?
3. Is your server publicly accessible (if in production)?
4. Does verification token match (if configured)?

**Test:**
```bash
# Check webhook is accessible
curl http://localhost:3000/api/webhooks/milesight

# Send test event manually
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","message":"hello"}'
```

### Verification Token Mismatch

If you see "Invalid verification token" errors:
1. Check the token in Minerva matches Milesight
2. Token is case-sensitive
3. Make sure URL includes `?token=...`

### Events Not Showing

1. Check database: `npm run db:studio` → MilesightWebhookEvent table
2. Check server logs for errors
3. Verify webhook is enabled
4. Test with curl command above

## 🌐 Production Deployment

### Update Environment Variables:
```env
APP_BASE_URL="https://your-production-domain.com"
```

### SSL/HTTPS Required:
- Most webhook providers require HTTPS
- Use a reverse proxy (nginx, Cloudflare)
- Or deploy to platforms with built-in SSL (Vercel, Railway)

### Webhook URL in Production:
```
https://your-domain.com/api/webhooks/milesight
```

## 📚 Additional Notes

- Events are stored indefinitely (clear manually via UI)
- No automatic cleanup (add cron job if needed)
- Webhook endpoint has no rate limiting (add if needed)
- Consider adding webhook signing verification in production
- Payload structure may vary - adjust parsing in route.ts if needed

---

For more information, consult the Milesight Development Platform documentation.

