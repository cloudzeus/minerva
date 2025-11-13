# Real-Time Features Documentation

## Overview

The Minerva RBAC application includes comprehensive real-time functionality using **Server-Sent Events (SSE)** to provide live updates across all dashboards without requiring page refreshes.

## Architecture

### Server-Sent Events (SSE)

The real-time system is built on **Next.js 15's native streaming capabilities** with Server-Sent Events:

- **Persistent connections**: Clients maintain a single long-lived HTTP connection
- **Server push**: Server broadcasts events to all connected clients
- **Automatic reconnection**: Clients automatically reconnect if disconnected
- **Low latency**: Sub-second updates for device telemetry and status changes

### Components

#### 1. SSE Endpoint (`/api/realtime`)

**File**: `src/app/api/realtime/route.ts`

The SSE endpoint creates a persistent connection and sends events to clients:

```typescript
GET /api/realtime
```

**Features**:
- Accepts client connections
- Sends initial connection confirmation
- Maintains keepalive every 30 seconds
- Handles client disconnections gracefully
- Broadcasts events to all active clients

#### 2. Broadcast Manager

**File**: `src/lib/realtime-broadcast.ts`

Manages active client connections and broadcasts events:

**Functions**:
- `addClient(controller)`: Register new SSE connection
- `removeClient(controller)`: Remove disconnected client
- `broadcastToClients(event)`: Send event to all connected clients
- `getClientCount()`: Get number of active connections

#### 3. Realtime Context Provider

**File**: `src/lib/realtime-context.tsx`

React context that manages SSE connection and provides hooks:

**Features**:
- Automatic connection management
- Connection state tracking
- Event history (last 100 events)
- Automatic reconnection on failure
- Toast notifications for events

**Hooks**:
- `useRealtime()`: Get connection state and events
- `useRealtimeEvent(type, callback)`: Subscribe to specific event types

#### 4. UI Components

**Realtime Indicator** (`src/components/realtime-indicator.tsx`):
- Shows "Live" badge when connected
- Displays connection status in header
- Visual indicator with animated pulse

**Realtime Device Card** (`src/components/realtime-device-card.tsx`):
- Wraps device telemetry cards
- Auto-refreshes on new telemetry
- Updates on device status changes

**Realtime Stats Cards** (`src/components/realtime-stats-cards.tsx`):
- Live statistics updates
- Refreshes on telemetry/device changes

**Realtime Device List** (`src/components/realtime-device-list.tsx`):
- Auto-updates device tables
- Refreshes on new devices or status changes

## Event Types

### 1. Connected Event

Sent when client first connects:

```json
{
  "type": "connected",
  "timestamp": 1763007319000,
  "message": "Real-time connection established"
}
```

### 2. New Telemetry Event

Sent when new device telemetry is received via webhook:

```json
{
  "type": "new_telemetry",
  "timestamp": 1763007319000,
  "data": {
    "deviceId": "1988618061618307073",
    "deviceName": "TS302",
    "eventType": "DEVICE_DATA",
    "temperature": 21.5,
    "humidity": 65.2,
    "battery": 93
  }
}
```

**Triggers**:
- Toast notification: "New telemetry data received"
- Device cards auto-refresh
- Stats cards update
- Charts update with new data point

### 3. Device Status Changed Event

Sent when a device goes online/offline:

```json
{
  "type": "device_status_changed",
  "timestamp": 1763007319000,
  "data": {
    "deviceId": "1988618061618307073",
    "deviceName": "TS302",
    "status": "ONLINE"
  }
}
```

**Triggers**:
- Toast notification: "{deviceName} is now online/offline"
- Device status badge updates
- Online device count updates

### 4. New Device Event

Sent when a new device is added:

```json
{
  "type": "new_device",
  "timestamp": 1763007319000,
  "data": {
    "deviceId": "1988618061618307073",
    "deviceName": "TS302"
  }
}
```

**Triggers**:
- Toast notification: "New device added"
- Device list refreshes
- Total device count updates

### 5. Keepalive Event

Sent every 30 seconds to maintain connection:

```json
{
  "type": "keepalive",
  "timestamp": 1763007319000
}
```

**Purpose**: Prevents connection timeout, ensures connection health

## Integration Points

### Webhook Integration

**File**: `src/app/api/webhooks/milesight/route.ts`

When Milesight webhook receives device data:

1. Parse and validate webhook payload
2. Store telemetry in database
3. **Broadcast real-time event** to all connected clients
4. Update last event timestamp

```typescript
// After storing telemetry
broadcastToClients({
  type: "new_telemetry",
  timestamp: Date.now(),
  data: { deviceId, deviceName, temperature, humidity, battery },
});
```

### Dashboard Integration

All role dashboards (Admin, Manager, Employee) include real-time features:

**Files**:
- `src/app/admin/page.tsx`
- `src/app/manager/page.tsx`
- `src/app/employee/page.tsx`

**Components Used**:
- `RealtimeIndicator`: Connection status in header
- `RealtimeStatsCards`: Live device statistics
- `RealtimeDeviceCard`: Auto-updating telemetry charts

### Device List Integration

**File**: `src/app/devices/list/page.tsx`

Device list table auto-refreshes when:
- New telemetry arrives
- Device status changes
- New devices are added

## Usage Examples

### 1. Subscribe to Specific Events

```typescript
import { useRealtimeEvent } from "@/lib/realtime-context";

function MyComponent() {
  useRealtimeEvent("new_telemetry", (data) => {
    console.log("New telemetry:", data);
    // Refresh data, update UI, etc.
  });

  return <div>...</div>;
}
```

### 2. Check Connection Status

```typescript
import { useRealtime } from "@/lib/realtime-context";

function MyComponent() {
  const { isConnected, lastEvent } = useRealtime();

  if (!isConnected) {
    return <div>Connecting to real-time updates...</div>;
  }

  return <div>Connected! Last event: {lastEvent?.type}</div>;
}
```

### 3. Broadcast Custom Events (Server-Side)

```typescript
import { broadcastToClients } from "@/lib/realtime-broadcast";

// In a server action or API route
broadcastToClients({
  type: "custom_event",
  timestamp: Date.now(),
  data: { message: "Something happened!" },
});
```

## Performance Considerations

### Connection Management

- **Automatic reconnection**: 5-second delay on connection failure
- **Keepalive**: 30-second intervals to maintain connection
- **Dead client cleanup**: Removes failed connections automatically

### Scaling

- SSE connections are lightweight (< 1KB overhead per client)
- In-memory client tracking (Set data structure)
- For high-traffic scenarios, consider:
  - Redis for connection state
  - Load balancer with sticky sessions
  - Separate WebSocket server

### Browser Compatibility

- SSE is supported in all modern browsers
- Automatic fallback to polling not implemented (Next.js 15 native)

## Security

### Authentication

Real-time endpoint requires authentication:
- Only authenticated users can connect
- Session validation on connection
- Role-based data filtering (future enhancement)

### Rate Limiting

Recommended for production:
- Limit SSE connections per user
- Throttle broadcast frequency
- Implement connection timeout

## Monitoring

### Connection Tracking

```typescript
import { getClientCount } from "@/lib/realtime-broadcast";

const activeConnections = getClientCount();
console.log(`Active SSE connections: ${activeConnections}`);
```

### Event Logging

All broadcasts are logged:

```
[SSE Broadcast] Sent event to 3 clients: new_telemetry
```

### Client-Side Logging

Connection events are logged in browser console:

```
[Realtime] Connected
[Realtime] Event received: { type: "new_telemetry", ... }
[Realtime] Connection error: ...
[Realtime] Attempting to reconnect...
```

## Future Enhancements

### Planned Features

1. **Selective Subscriptions**: Subscribe to specific device IDs
2. **Historical Playback**: Replay missed events on reconnection
3. **Role-Based Events**: Filter events by user role
4. **WebSocket Alternative**: Optional WebSocket for bidirectional communication
5. **Event Acknowledgment**: Track which events were processed
6. **Compression**: Compress event payload for bandwidth optimization

### Advanced Use Cases

- Real-time alerts and alarms
- Live video/image streaming
- Collaborative editing
- Real-time chat/notifications
- Live analytics dashboards

## Troubleshooting

### Connection Not Established

**Check**:
1. Browser console for errors
2. Network tab for `/api/realtime` request
3. Server logs for SSE endpoint errors

**Common Issues**:
- Authentication failure
- CORS configuration
- Reverse proxy buffering (disable with `X-Accel-Buffering: no`)

### Events Not Received

**Check**:
1. Webhook is calling `broadcastToClients()`
2. Event payload format is correct
3. Active client count > 0

**Debug**:
```typescript
import { getClientCount } from "@/lib/realtime-broadcast";
console.log("Active clients:", getClientCount());
```

### High Memory Usage

**Causes**:
- Too many active connections
- Event history not limited

**Solutions**:
- Limit event history: `setEvents((prev) => [data, ...prev].slice(0, 100))`
- Implement connection limits per user
- Clear old connections periodically

## Testing

### Manual Testing

1. Open multiple browser tabs/windows
2. Login to different roles
3. Send test webhook: `POST /api/webhooks/milesight`
4. Verify all tabs receive events simultaneously

### Automated Testing

```typescript
// Example test for SSE endpoint
it("should broadcast events to all clients", async () => {
  const client1 = await fetch("/api/realtime");
  const client2 = await fetch("/api/realtime");
  
  broadcastToClients({ type: "test", data: {} });
  
  // Verify both clients receive event
});
```

## Deployment

### Environment Variables

No additional environment variables required.

### Production Checklist

- [ ] Enable HTTPS (required for SSE in production)
- [ ] Configure reverse proxy to not buffer SSE
- [ ] Set up connection monitoring
- [ ] Implement rate limiting
- [ ] Test auto-reconnection under network failures
- [ ] Monitor server memory usage

### Nginx Configuration

```nginx
location /api/realtime {
    proxy_pass http://your-next-app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
}
```

## Summary

The real-time system provides:

✅ **Live device telemetry updates**  
✅ **Automatic status change notifications**  
✅ **Real-time data table updates**  
✅ **Live charts and graphs**  
✅ **Connection status indicators**  
✅ **Automatic reconnection**  
✅ **Toast notifications**  
✅ **Zero configuration for end users**  

All powered by Next.js 15's native streaming capabilities and Server-Sent Events! 🚀

