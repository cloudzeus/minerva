# Milesight Device Management Guide

## 🎯 Overview

The Device Management feature allows ADMIN users to manage all Milesight IoT devices directly from the Minerva RBAC application. All operations interact with the Milesight Cloud API in real-time.

**SECURITY**: This feature is **ADMIN-ONLY**.

## 📋 Features

### ✅ View & Search Devices
- List all devices from your Milesight application
- Search by name, SN, DevEUI, or IMEI
- Sort by any column
- Show/hide columns
- Export to Excel

### ✅ Add Devices
- Add new devices to Milesight platform via modal
- Required: Serial Number (SN)
- Optional: DevEUI, IMEI, Name, Description, Tag

### ✅ Edit Devices
- Update device name, description, and tag
- Changes sync to Milesight immediately

### ✅ View Device Details
- Click "View Details" to see full device information
- Shows all identifiers (SN, DevEUI, IMEI)
- Device type, status, sync info

### ✅ Delete Devices
- Remove devices from Milesight platform
- Confirmation dialog prevents accidents

### ✅ Sync Devices
- Fetch all devices from Milesight API
- Store in local cache for faster access
- Auto-sync when searching

## 🚀 Getting Started

### Prerequisites

1. **Milesight Authentication Must Be Configured**:
   - Go to Settings → Milesight Auth
   - Enter Base URL, Client ID, Client Secret
   - Save & Connect to get access token

2. **Access Device Management**:
   - Login as ADMIN
   - Navigate to: Settings → Device Management
   - Or visit: `/admin/devices/milesight`

### First Time Setup

1. **Click "SYNC" button** to fetch devices from Milesight
2. Devices will appear in the table
3. Local cache is updated for faster subsequent loads

## 📊 Device Table

The device table shows:

| Column | Description |
|--------|-------------|
| **Select** | Checkbox for bulk operations |
| **Name** | Device display name |
| **Serial Number** | Device SN |
| **DevEUI** | LoRaWAN Device EUI |
| **Type** | Device model/type |
| **Status** | Online/Offline status |
| **Tag** | Custom tag for organization |
| **Last Synced** | When data was last fetched |
| **Actions** | Dropdown menu (View, Edit, Delete) |

### Table Features:
- ✅ **Sortable columns** - Click headers to sort
- ✅ **Resizable columns** - Drag borders
- ✅ **Column visibility** - Show/hide via "Columns" button
- ✅ **Row selection** - Checkboxes for bulk operations
- ✅ **Search** - Filter by any field
- ✅ **Export to Excel** - Download device list

## ➕ Adding a Device

### Via UI:
1. Click **"ADD DEVICE"** button
2. Fill in the form:
   - **Serial Number** (required)
   - DevEUI (optional - for LoRaWAN devices)
   - IMEI (optional - for cellular devices)
   - Name (optional - friendly name)
   - Description (optional)
   - Tag (optional - for grouping)
3. Click **"ADD DEVICE"**
4. Device is added to Milesight platform
5. Appears in table immediately

### API Call Made:
```
POST {baseUrl}/device/openapi/v1/devices
Authorization: Bearer {access_token}
Body: {
  "sn": "SN-12345678",
  "devEUI": "0123456789ABCDEF",
  "name": "Temperature Sensor #1",
  ...
}
```

## ✏️ Editing a Device

### Via UI:
1. Click row **actions menu (⋮)**
2. Select **"Edit"**
3. Update fields:
   - Name
   - Description
   - Tag
4. Click **"UPDATE DEVICE"**
5. Changes sync to Milesight immediately

**Note**: Device identifiers (SN, DevEUI, IMEI) cannot be changed.

### API Call Made:
```
PUT {baseUrl}/device/openapi/v1/devices/{deviceId}
Authorization: Bearer {access_token}
Body: {
  "name": "Updated Name",
  "description": "Updated description",
  "tag": "warehouse-b"
}
```

## 👁️ Viewing Device Details

### Via UI:
1. Click row **actions menu (⋮)**
2. Select **"View Details"**
3. See full device information:
   - All identifiers
   - Status with color indicator
   - Sync timestamps
   - Technical details

### What You'll See:
- **Device Information Card**: Name, Status, SN, Type, DevEUI, IMEI, Tag
- **Technical Details Card**: Device IDs, timestamps

## 🗑️ Deleting a Device

### Via UI:
1. Click row **actions menu (⋮)**
2. Select **"Delete"**
3. Confirm in dialog
4. Device removed from Milesight platform
5. Removed from local cache

**Warning**: This action cannot be undone!

### API Call Made:
```
DELETE {baseUrl}/device/openapi/v1/devices/{deviceId}
Authorization: Bearer {access_token}
```

## 🔄 Syncing Devices

### Auto-Sync:
- Happens when you search/list devices
- Updates local cache with latest data from Milesight

### Manual Sync:
1. Click **"SYNC"** button
2. Fetches ALL devices from Milesight (paginated)
3. Updates local cache
4. Shows count of synced devices

### Why Sync?
- Local cache improves performance
- Faster page loads
- Works offline (shows cached data)
- Automatic updates when managing devices

## 📤 Exporting Devices

1. Click **"EXPORT"** button
2. Excel file downloads:
   - Filename: `milesight-devices_2024-11-13.xlsx`
   - Includes: Name, SN, DevEUI, IMEI, Type, Status, Tag, Last Sync
   - Formatted headers with styling
   - Auto-filter enabled

## 🔒 Security

### Access Control:
- ✅ **ADMIN-only** (middleware + page guards + action guards)
- ✅ **Milesight auth required** (uses stored access token)
- ✅ **Token validation** (checks expiry before API calls)
- ✅ **Error handling** (graceful failures with helpful messages)

### Data Protection:
- ✅ **Server-side API calls** (never expose tokens to browser)
- ✅ **Local cache** (reduces API calls, improves performance)
- ✅ **Audit logging** (all device changes logged to ActivityLog)

## 🚨 Troubleshooting

### "Milesight Not Connected" Error

**Cause**: Authentication not configured or token expired

**Fix**:
1. Go to Settings → Milesight Auth
2. Check connection status
3. If expired, click "REFRESH TOKEN"
4. If not configured, enter credentials and connect

### No Devices Showing

**Cause**: Devices not synced or none exist in Milesight

**Fix**:
1. Click "SYNC" button to fetch from Milesight
2. If still empty, add devices in Milesight platform first
3. Check console logs for API errors

### Add Device Fails

**Common issues**:
- Duplicate serial number (SN must be unique)
- Invalid DevEUI format
- Access token expired
- Insufficient permissions in Milesight

**Check**:
- Server console logs for detailed error
- Milesight platform device requirements
- Token validity in Settings → Milesight Auth

### API Errors

All errors are logged to console:
```
[Milesight Devices] Search error: ...
[Milesight Devices] Create error: ...
[Milesight Devices] Update error: ...
[Milesight Devices] Delete error: ...
```

Check these for detailed API response information.

## 📚 API Reference

### Endpoints Used:

| Operation | Method | Endpoint |
|-----------|--------|----------|
| **Search Devices** | POST | `/device/openapi/v1/devices/search` |
| **Add Device** | POST | `/device/openapi/v1/devices` |
| **Get Device** | GET | `/device/openapi/v1/devices/{id}` |
| **Update Device** | PUT | `/device/openapi/v1/devices/{id}` |
| **Delete Device** | DELETE | `/device/openapi/v1/devices/{id}` |

All require `Authorization: Bearer {access_token}` header.

## 💾 Local Cache

Devices are cached in MySQL for performance:

```prisma
model MilesightDeviceCache {
  deviceId    String @unique  // Milesight device ID
  sn          String?         // Serial number
  devEUI      String?         // LoRaWAN ID
  imei        String?         // Cellular ID
  name        String?
  description String?
  tag         String?
  lastStatus  String?         // ONLINE/OFFLINE
  deviceType  String?
  lastSyncAt  DateTime        // When synced from Milesight
}
```

**Benefits**:
- Faster page loads
- Works when Milesight API is slow
- Reduces API quota usage
- Enables offline viewing

**Sync Strategy**:
- Manual sync via "SYNC" button
- Auto-sync during search operations
- Per-device sync when viewing details
- Cache updated after add/edit/delete

## 🎨 UI/UX Features

- Modern, clean interface
- Color-coded status indicators (green = online, gray = offline)
- Responsive design (works on mobile)
- Loading states for all operations
- Toast notifications for feedback
- Confirmation dialogs for destructive actions
- Modal forms (no page navigation)
- Search with instant filtering

## 📈 Future Enhancements

Potential additions:
- Bulk device operations (activate, deactivate, tag multiple)
- Device telemetry/data visualization
- Real-time status updates via webhooks
- Device grouping and organization
- Advanced filtering and saved searches
- Device command sending (if supported by API)

---

**Device Management is production-ready and fully integrated with Milesight Cloud Platform!** 🚀

