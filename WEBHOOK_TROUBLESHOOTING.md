# Milesight Webhook Troubleshooting Guide

## Issue: Not Receiving Messages from Milesight

If you're not receiving device data from Milesight, follow this step-by-step troubleshooting guide.

---

## Step 1: Verify Webhook is Enabled in MINERVA

### Check in Admin Dashboard

1. Log in as **Admin**
2. Go to **Admin → Settings → Milesight Webhook**
3. Check the status indicator at the top right:
   - 🟢 **ACTIVE** - Webhook is enabled
   - 🔴 **INACTIVE** - Webhook is disabled

### Enable Webhook

If disabled:
1. Scroll to **"WEBHOOK CONFIGURATION"** section
2. Toggle **"Enable Webhook"** to ON
3. Click **"Save Settings"**

---

## Step 2: Verify Webhook URL is Correct

### Get Your Webhook URL

From **Admin → Settings → Milesight Webhook**, find the **"WEBHOOK CALLBACK URL"** section.

Your URL should look like:
```
https://your-app-name.up.railway.app/api/webhooks/milesight
```

Or with verification token:
```
https://your-app-name.up.railway.app/api/webhooks/milesight?token=your_token_here
```

**Important Notes:**
- ✅ URL must use **HTTPS** (not HTTP) for Railway deployment
- ✅ URL must be publicly accessible (not localhost)
- ✅ URL path is `/api/webhooks/milesight` (case-sensitive)

---

## Step 3: Check Milesight Platform Configuration

### Login to Milesight Development Platform

1. Go to https://developer.milesight.com
2. Log in to your account
3. Navigate to your **Application**

### Verify Webhook Settings

Go to **Application → Settings → Webhook** and check:

1. **Callback URI** matches your MINERVA webhook URL exactly
2. **Webhook Status** is **Enabled**
3. **Events** are selected (minimum: `DEVICE_DATA`)
4. **Verification method** matches your MINERVA configuration:
   - Token-based verification
   - Secret-based verification
   - UUID-based verification

### Recommended Event Subscriptions

Enable these events in Milesight:
- ✅ `DEVICE_DATA` - Temperature sensor readings (REQUIRED)
- ✅ `DEVICE_STATUS` - Online/offline status
- ✅ `DEVICE_ALARM` - Device alerts
- ✅ `DEVICE_LOCATION` - Location updates (if applicable)

---

## Step 4: Test Webhook Connectivity

### Option A: Test from MINERVA Dashboard

1. Go to **Admin → Settings → Milesight Webhook**
2. Click **"Test Webhook"** button
3. Check the result:
   - ✅ **Success**: Webhook endpoint is reachable
   - ❌ **Failed**: Connection issue or webhook disabled

### Option B: Test with curl

From your terminal:

```bash
# Basic test
curl -X POST https://your-app-name.up.railway.app/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "DEVICE_DATA",
    "eventId": "test-123",
    "data": {
      "deviceProfile": {
        "deviceId": "12345",
        "name": "Test Device",
        "sn": "TEST-SN",
        "model": "TS302"
      },
      "type": "PROPERTY",
      "ts": 1699900000000,
      "payload": {
        "temperature_left": 22.5,
        "temperature_right": 23.0,
        "battery": 85
      }
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Events received successfully",
  "eventsProcessed": 1
}
```

### Option C: Check Railway Logs

1. Log in to Railway dashboard
2. Go to your project
3. Click on your service
4. Open **Deployments** tab
5. View **Logs** for your latest deployment

Look for:
- `[Milesight Webhook] Received` - Webhook is receiving data ✅
- `[Milesight Webhook] Invalid verification token` - Token mismatch ⚠️
- `[Milesight Webhook] Webhook is not enabled` - Webhook disabled ⚠️
- `[Milesight Webhook] Error processing webhook` - Server error ❌

---

## Step 5: Verify Device Registration

Even if webhook is working, telemetry will be ignored if device is not registered.

### Check Registered Devices

1. Go to **Admin → Devices → Milesight Devices**
2. Verify your TS302 sensors are listed
3. Check device details:
   - **Serial Number (SN)** must match Milesight platform
   - **Device ID** must match Milesight platform
   - **Status** should show recent sync time

### Register Missing Devices

If device is not listed:
1. Click **"Add Device"** button
2. Enter device details **exactly as shown in Milesight platform**:
   - Device ID
   - Serial Number (SN)
   - Device Name
3. Save the device

**Critical:** Serial Number (SN) is used to match incoming webhook data with registered devices. If SN doesn't match, data will be ignored.

---

## Step 6: Check Recent Webhook Events

### View Event History

1. Go to **Admin → Settings → Milesight Webhook**
2. Scroll to **"RECENT EVENTS"** section
3. Check for recent entries:
   - **Empty list**: No events received ❌
   - **Events listed**: Webhook is working ✅
   - **Old timestamps**: No recent events ⚠️

### Understand Event Status

- **Last Event At**: Timestamp of most recent webhook call
- **Total Events**: Cumulative count of all received events
- **Event Type**: Type of event (DEVICE_DATA, DEVICE_STATUS, etc.)

---

## Step 7: Verify Environment Variables

### Required Environment Variables (Railway)

Ensure these are set in Railway:

```bash
# Database
DATABASE_URL=mysql://...

# Authentication
AUTH_SECRET=your_secret_here
AUTH_URL=https://your-app-name.up.railway.app

# App Base URL (IMPORTANT for webhook)
APP_BASE_URL=https://your-app-name.up.railway.app

# Email (optional, for alerts)
BREVO_KEY=your_brevo_key
BREVO_FROM_EMAIL=alerts@minerva.wwa.gr
```

**Critical**: `APP_BASE_URL` must match your Railway deployment URL.

### Check in Railway

1. Go to Railway project
2. Click on your service
3. Go to **Variables** tab
4. Verify `APP_BASE_URL` is correct

---

## Step 8: Check Firewall/Network Issues

### Railway Networking

Railway services are publicly accessible by default, but check:

1. **Custom Domain**: If using custom domain, ensure DNS is configured
2. **Port Configuration**: Railway automatically assigns ports, no config needed
3. **HTTPS**: Railway provides HTTPS automatically

### Milesight Platform Outbound

Ensure Milesight platform can make outbound HTTPS requests:
- Not blocked by firewall
- Not restricted by organization policies
- Can reach Railway's servers

---

## Step 9: Force Device Data Sync

### Manual Trigger from Milesight

1. Log in to Milesight Development Platform
2. Go to **Devices** section
3. Select your device (TS302 sensor)
4. Look for **"Send Uplink"** or **"Trigger Report"** option
5. Manually trigger a data transmission
6. Check MINERVA dashboard for new data within 1-2 minutes

### Check Device Status

In Milesight platform:
- **Device Online**: Green indicator
- **Last Seen**: Recent timestamp
- **Signal Strength**: Good RSSI/SNR values

---

## Step 10: Database Check

### Verify Webhook Events Table

If you have database access, check:

```sql
-- Check recent webhook events
SELECT * FROM MilesightWebhookEvent 
ORDER BY createdAt DESC 
LIMIT 10;

-- Check webhook settings
SELECT * FROM MilesightWebhookSettings;

-- Check device telemetry
SELECT * FROM MilesightDeviceTelemetry 
ORDER BY dataTimestamp DESC 
LIMIT 10;

-- Check registered devices
SELECT * FROM MilesightDeviceCache;
```

---

## Common Issues & Solutions

### Issue 1: Webhook Disabled

**Symptoms:**
- No recent events in dashboard
- Status shows "INACTIVE"

**Solution:**
1. Go to Admin → Settings → Milesight Webhook
2. Enable webhook
3. Save settings

### Issue 2: Wrong Webhook URL in Milesight

**Symptoms:**
- Milesight shows errors
- No events received in MINERVA

**Solution:**
1. Get correct URL from MINERVA dashboard
2. Update in Milesight platform
3. Ensure HTTPS (not HTTP)
4. Test connection

### Issue 3: Device Not Registered

**Symptoms:**
- Webhook events received
- No telemetry data shown
- Logs show: "Device not registered in system"

**Solution:**
1. Check Railway logs for device SN
2. Register device with exact same SN
3. Wait for next data transmission

### Issue 4: Token/Secret Mismatch

**Symptoms:**
- Logs show: "Invalid verification token"
- 401 Unauthorized responses

**Solution:**
1. Copy verification token from MINERVA
2. Update in Milesight platform webhook settings
3. Or disable token verification temporarily

### Issue 5: Device Not Sending Data

**Symptoms:**
- Everything configured correctly
- Still no data

**Solution:**
1. Check device battery level
2. Verify device is within gateway range
3. Check device reporting interval (may be 10-15 minutes)
4. Manually trigger data transmission in Milesight
5. Check device logs in Milesight platform

---

## Debug Checklist

Use this quick checklist:

- [ ] Webhook enabled in MINERVA ✓
- [ ] Webhook URL configured in Milesight ✓
- [ ] Webhook URL uses HTTPS ✓
- [ ] Devices registered in MINERVA ✓
- [ ] Device SN matches exactly ✓
- [ ] Events subscribed in Milesight ✓
- [ ] Recent events visible in dashboard ✓
- [ ] Railway deployment is running ✓
- [ ] APP_BASE_URL environment variable correct ✓
- [ ] Device is online in Milesight ✓
- [ ] Device battery is good ✓
- [ ] No firewall blocking webhook ✓

---

## Testing Data Flow

To verify end-to-end:

1. **Trigger device reading** in Milesight
2. **Check Railway logs** for webhook reception (1-2 minutes)
3. **Check MINERVA dashboard** for new data
4. **Verify database** has new telemetry record

Expected flow:
```
Device → Gateway → Milesight Cloud → Webhook → MINERVA → Database → Dashboard
  TS302    UG65      Developer API       Railway    Next.js    MySQL    React
```

---

## Get Help

If still not working after following all steps:

1. **Check Railway Logs**: Look for error messages
2. **Check Milesight Logs**: Look for webhook delivery failures
3. **Export Recent Events**: From MINERVA webhook settings
4. **Contact Support**: Provide logs and configuration details

---

## Monitoring

Set up continuous monitoring:

1. **Live Webhook Indicator**: Green dot on webhook settings page shows recent activity
2. **Last Event Timestamp**: Should update every 10-15 minutes (device reporting interval)
3. **Total Events Counter**: Should increment with each transmission
4. **Device Status**: Should show "ONLINE" and recent sync time

---

**Last Updated**: November 13, 2025  
**Version**: 1.0.0  
**MINERVA Device Monitoring System**

