# 📊 Dashboard Device Telemetry Charts

## 🎨 Features Implemented

### ✅ Fixed Issues:
- **Fixed `latestReading` undefined error** - Now safely handles empty telemetry arrays
- **Added null checks** for all sensor readings

### 📈 Interactive Area Chart Style:
Each device card now features a **shadcn-style interactive area chart** with:

1. **Time Range Selector** (Top-right dropdown)
   - Last 1 hour
   - Last 6 hours
   - Last 24 hours (default)
   - Last 7 days

2. **Two Temperature Sensors** displayed as stacked area charts:
   - 🌡️ **Temperature Left** (Orange gradient: `#f97316`)
   - 🌡️ **Temperature Right** (Light orange gradient: `#fb923c`)

3. **Current Readings** (Top section)
   - **Temp Left** - Latest reading from left sensor
   - **Temp Right** - Latest reading from right sensor

4. **Chart Features**:
   - ✅ **Interactive tooltips** with formatted dates
   - ✅ **Smooth gradient fills** with opacity
   - ✅ **Natural curve smoothing**
   - ✅ **Legend** showing both sensors
   - ✅ **Responsive design** (adapts to screen size)
   - ✅ **Auto-scaling Y-axis**
   - ✅ **Minimal X-axis** (time labels)

## 🎯 Data Flow

### Sensor Data Parsing:
```typescript
// From webhook payload
{
  "temperature_left": 1.9,
  "temperature_right": 2.1,
  "battery": 93
}
```

### Chart Data Structure:
```typescript
{
  timestamp: 1763007319532,
  date: new Date(1763007319532),
  temperatureLeft: 1.9,   // From temperature_left or fallback to temperature
  temperatureRight: 2.1,  // From temperature_right
}
```

## 🎨 Visual Design

### Card Layout:
```
┌─────────────────────────────────────────┐
│ 🔧 Device Name              [Dropdown]  │ ← Header with time selector
│ 🟢 ONLINE                               │
├─────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐            │
│ │ 🌡 Temp L│  │ 🌡 Temp R│            │ ← Current readings
│ │  22.5°C  │  │  23.1°C  │            │
│ └──────────┘  └──────────┘            │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │     [Interactive Area Chart]     │   │ ← Time series
│ │                                  │   │
│ │  ═══ Temp Left                   │   │
│ │  ═══ Temp Right                  │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Color Scheme:
- **Temperature Left**: Orange (`#f97316`)
- **Temperature Right**: Light Orange (`#fb923c`)
- **Online Status**: Green
- **Offline Status**: Gray
- **Background**: Muted with subtle gradients

## 📊 Dashboard Grid

### Layout:
- **Desktop (lg)**: 3 columns
- **Tablet (md)**: 2 columns
- **Mobile**: 1 column

### Each Dashboard Shows:
1. **User/Team Stats** (top row)
2. **Device Overview** (5 stat cards)
3. **Device Cards Grid** (interactive charts)
4. **Activity Charts** (bottom)

## 🔄 Time Filtering

The time range selector filters data dynamically:

```typescript
const timeRanges = {
  "1h": 60 * 60 * 1000,        // Last hour
  "6h": 6 * 60 * 60 * 1000,    // Last 6 hours
  "24h": 24 * 60 * 60 * 1000,  // Last 24 hours
  "7d": 7 * 24 * 60 * 60 * 1000 // Last 7 days
};
```

If no data in selected range, falls back to **last 50 readings**.

## 📱 Available on All Dashboards

- ✅ **ADMIN Dashboard** (`/admin`)
- ✅ **MANAGER Dashboard** (`/manager`)
- ✅ **EMPLOYEE Dashboard** (`/employee`)

All three dashboards share the same device telemetry cards!

## 🚀 Usage

### View Dashboards:
```bash
npm run dev
```

1. **Login** as any role
2. **View Dashboard** - See device cards with charts
3. **Select Time Range** - Use dropdown to filter data
4. **Hover Chart** - See detailed tooltips

### Send Test Data:
```bash
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -H "X-Webhook-UUID: your-uuid" \
  -H "X-Webhook-Secret: your-secret" \
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

## 🎯 Key Benefits

1. **Visual Clarity** - Two sensor readings clearly distinguished
2. **Time Control** - Users can zoom in/out on data
3. **Real-time Updates** - Refreshes with new webhook data
4. **Responsive** - Works on all screen sizes
5. **Professional** - Modern shadcn UI style
6. **Interactive** - Hover tooltips with precise values

## 📊 Chart Library

- **Recharts** - React charting library
- **shadcn/ui Chart** - Pre-styled chart components
- **Area Chart** - Smooth gradient visualization
- **Natural Curves** - Beautiful smooth lines

---

**Your dashboards now have professional, interactive temperature monitoring!** 🎉

