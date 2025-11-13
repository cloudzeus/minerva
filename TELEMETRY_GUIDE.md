# Milesight Device Telemetry Storage

## 🎯 Overview

The application now automatically stores **all device telemetry data** received via webhooks in a structured database model for analysis, monitoring, and historical tracking.

## 📊 What Gets Stored

### From Each Webhook Event:

```json
{
  "deviceId": 1988618061618307073,
  "webhookPushEvent": {
    "eventId": "b1782ee5-a27f-4732-96f4-f7cbbda21d61",
    "eventType": "DEVICE_DATA",
    "eventVersion": "1.0",
    "eventCreatedTime": 1763007319,
    "data": {
      "ts": 1763007319532,
      "type": "PROPERTY",
      "payload": {
        "temperature_left": 1.9,
        "temperature_right": 2.1,
        "battery": 93
      },
      "deviceProfile": {
        "sn": "6723D38552440017",
        "name": "TS302",
        "model": "TS302",
        "devEUI": "24E124723D385524",
        "deviceId": 1988618061618307073
      }
    }
  }
}
```

### Stored In Database:

**MilesightDeviceTelemetry** table with:
- ✅ Event metadata (eventId, eventType, eventVersion)
- ✅ Device reference (links to MilesightDeviceCache)
- ✅ Timestamp (exact time from device sensor)
- ✅ Data type (PROPERTY, ALARM, EVENT)
- ✅ Full payload (JSON)
- ✅ Device profile (SN, name, model, DevEUI)
- ✅ **Extracted sensor values**:
  - 🌡️ Temperature (from temperature, temperature_left, temperature_right)
  - 💧 Humidity
  - 🔋 Battery percentage
- ✅ Complete sensor data (JSON for all fields)

## 🔍 Viewing Telemetry Data

### In Device Detail Page:

1. Go to **Settings → Device Management**
2. Click device **actions (⋮)** → **View Details**
3. Scroll to **"TELEMETRY DATA"** card
4. See table with all sensor readings

### Telemetry Table Shows:

| Column | Description | Icon |
|--------|-------------|------|
| **Timestamp** | When sensor data was recorded | - |
| **Type** | Data type (PROPERTY, ALARM, etc.) | - |
| **Temperature** | Temperature reading | 🌡️ Orange |
| **Humidity** | Humidity percentage | 💧 Blue |
| **Battery** | Battery level | 🔋 Green |
| **Other Data** | Expandable JSON with all fields | - |

### Features:
- ✅ Last 50 records shown
- ✅ Newest first (descending order)
- ✅ Color-coded sensor icons
- ✅ Expandable "Other Data" shows full JSON
- ✅ Formatted timestamps
- ✅ Missing values shown as "—"

## 📡 Automatic Storage

### When Webhook Receives Event:

```
1. Webhook endpoint receives POST
2. Validates security (UUID/Secret/Token)
3. Parses event structure
4. Extracts device ID and event data
5. Stores in MilesightWebhookEvent (raw)
6. If eventType === "DEVICE_DATA":
   ✅ Creates MilesightDeviceTelemetry record
   ✅ Extracts temperature, humidity, battery
   ✅ Stores full payload JSON
   ✅ Links to device cache
7. Updates webhook settings (last event timestamp)
8. Returns success to Milesight
```

## 🗄️ Database Schema

```prisma
model MilesightDeviceTelemetry {
  id             String  @id @default(cuid())
  deviceId       String  // Links to MilesightDeviceCache
  
  // Event info
  eventId        String
  eventType      String  // "DEVICE_DATA", "DEVICE_STATUS"
  eventVersion   String?
  
  // Timestamps
  dataTimestamp  BigInt  // From device sensor (ms)
  createdAt      DateTime // When received by webhook
  
  // Data
  dataType       String  // "PROPERTY", "ALARM", "EVENT"
  payload        String  // Full sensor payload JSON
  
  // Extracted values (for easy querying)
  temperature    Float?  // Celsius
  humidity       Float?  // Percentage
  battery        Int?    // Percentage
  
  // Device snapshot
  deviceSn       String?
  deviceName     String?
  deviceModel    String?
  deviceDevEUI   String?
  
  // Full sensor data
  sensorData     String? // Complete JSON
  
  processed      Boolean @default(false)
  processedAt    DateTime?
}
```

## 🔍 Querying Telemetry

### Via Prisma:

```typescript
// Get telemetry for specific device
const telemetry = await prisma.milesightDeviceTelemetry.findMany({
  where: { deviceId: "1988618061618307073" },
  orderBy: { dataTimestamp: "desc" },
  take: 100,
});

// Get latest temperature readings
const temps = await prisma.milesightDeviceTelemetry.findMany({
  where: {
    deviceId: "1988618061618307073",
    temperature: { not: null },
  },
  orderBy: { dataTimestamp: "desc" },
  take: 20,
});

// Get all data from last hour
const oneHourAgo = BigInt(Date.now() - 60 * 60 * 1000);
const recentData = await prisma.milesightDeviceTelemetry.findMany({
  where: {
    deviceId: "1988618061618307073",
    dataTimestamp: { gte: oneHourAgo },
  },
});
```

## 📈 Use Cases

### 1. Historical Analysis
- View temperature trends over time
- Monitor battery drain rates
- Analyze sensor patterns

### 2. Alerting (Future)
- Trigger alerts on threshold breaches
- Notify on battery low
- Detect anomalies

### 3. Reporting
- Generate daily/weekly reports
- Export telemetry to Excel
- Create charts and graphs

### 4. Debugging
- See exact sensor values at specific times
- Compare webhook payload with stored data
- Verify data integrity

## 🧪 Testing

### Send Test Webhook:

```bash
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -d '[{
    "deviceId": 1988618061618307073,
    "webhookPushEvent": {
      "eventId": "test-123",
      "eventType": "DEVICE_DATA",
      "eventVersion": "1.0",
      "eventCreatedTime": 1763007319,
      "data": {
        "ts": 1763007319532,
        "type": "PROPERTY",
        "payload": {
          "temperature_left": 22.5,
          "temperature_right": 23.1,
          "humidity": 65,
          "battery": 95
        },
        "deviceProfile": {
          "sn": "6723D38552440017",
          "name": "TS302",
          "model": "TS302",
          "devEUI": "24E124723D385524",
          "deviceId": 1988618061618307073
        }
      }
    }
  }]'
```

### Verify Storage:

1. Check webhook received:
   ```
   [Milesight Webhook] Received 1 event(s)
   [Milesight Webhook] Stored telemetry for device: 1988618061618307073
   [Milesight Webhook] Processed 1 event(s) successfully
   ```

2. Check database:
   ```bash
   npm run db:studio
   ```
   - Open `MilesightDeviceTelemetry` table
   - See new record with extracted values

3. View in UI:
   - Go to device detail page
   - See "TELEMETRY DATA" card
   - View sensor readings in table

## 📊 Data Retention

Currently, all telemetry is stored indefinitely.

### Future Enhancements:
- Add data retention policy (delete old records)
- Archive to separate table
- Aggregate to hourly/daily summaries
- Implement data cleanup cron job

### Manual Cleanup (if needed):

```typescript
// Delete telemetry older than 30 days
const thirtyDaysAgo = BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000);

await prisma.milesightDeviceTelemetry.deleteMany({
  where: {
    dataTimestamp: { lt: thirtyDaysAgo },
  },
});
```

## 🎨 UI Features

### Telemetry Table:
- **Color-coded icons** for each sensor type
- **Expandable details** for complex payloads
- **Formatted values** (temperature in °C, humidity in %)
- **Sorted by time** (newest first)
- **Monospace fonts** for numeric values

### Device Page Enhancements:
- Shows telemetry count in technical details
- Dedicated telemetry data card
- Last 50 records displayed
- Easy to scan sensor readings

## 🔄 Next Steps

After running `npm run db:push`:

1. **Send test webhook** (curl command above)
2. **View device detail page** 
3. **See telemetry table** populated with data
4. **Live indicator** pulses green when webhook received
5. **Telemetry data** automatically stored and displayed

---

**Your devices now have full telemetry tracking and historical data storage!** 📊🎉

