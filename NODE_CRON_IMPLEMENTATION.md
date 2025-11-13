# node-cron Implementation Summary

## ✅ Implementation Complete!

Automatic token refresh has been successfully implemented using **node-cron**. The system now automatically refreshes your Milesight API token before it expires, ensuring uninterrupted device data flow.

---

## What Was Implemented

### 1. Internal Cron Job System

Created `/src/lib/cron.ts` with:
- Token expiration checking logic
- Automatic refresh when token expires within 5 minutes
- Comprehensive logging for monitoring
- Error handling for reliability
- Runs every 30 minutes

### 2. Application Initialization

Created `/src/instrumentation.ts`:
- Automatically starts cron jobs when app boots
- Uses Next.js 15 instrumentation feature
- No configuration needed - works out of the box

### 3. Dependencies Added

Updated `package.json`:
- `node-cron`: ^3.0.3
- `@types/node-cron`: ^3.0.11

### 4. Documentation

Created comprehensive guides:
- `AUTO_TOKEN_REFRESH.md` - Complete setup and troubleshooting guide
- `NODE_CRON_IMPLEMENTATION.md` - This summary document

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Application Starts (npm start / Railway deployment)    │
└──────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js calls instrumentation.ts register()            │
└──────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  startCronJobs() initializes node-cron scheduler        │
└──────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Cron job scheduled: */30 * * * * (every 30 minutes)    │
└──────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Initial token check runs immediately                   │
└──────────────────────┬──────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Every 30 minutes...        │
        └──────────┬──────────────────┘
                  │
                  ▼
        ┌─────────────────────────────┐
        │ Check token expiration       │
        └──────────┬──────────────────┘
                  │
                  ▼
        ┌─────────────────────────────┐
        │ Expires in < 5 minutes?      │
        └──────┬────────────┬─────────┘
              │            │
             YES          NO
              │            │
              ▼            ▼
    ┌──────────────┐  ┌──────────┐
    │ Refresh      │  │ Skip     │
    │ Token        │  │ (wait)   │
    └──────┬───────┘  └──────────┘
          │
          ▼
    ┌──────────────┐
    │ Update DB    │
    │ Log success  │
    └──────────────┘
```

---

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/cron.ts` | ✅ Created | Cron job definitions and token refresh logic |
| `src/instrumentation.ts` | ✅ Created | Starts cron jobs on app boot |
| `package.json` | ✅ Modified | Added node-cron dependencies |
| `next.config.ts` | ✅ No changes | Instrumentation works by default in Next.js 15 |
| `AUTO_TOKEN_REFRESH.md` | ✅ Created | Complete documentation |

---

## Deployment Instructions

### For Railway (Current Deployment)

1. **Push Changes:**
   ```bash
   git add .
   git commit -m "Add automatic token refresh with node-cron"
   git push
   ```

2. **Railway Auto-Deploy:**
   - Railway will automatically detect the push
   - Build and deploy the new version
   - Cron job starts automatically

3. **Verify Deployment:**
   - Check Railway logs for:
     ```
     🚀 [Instrumentation] Starting server initialization...
     [Cron] Initializing cron jobs...
     [Cron] ✅ Token refresh job scheduled (every 30 minutes)
     ```

### First-Time Setup After Deployment

1. **Manually refresh token once:**
   - Go to Admin → Settings → Milesight Authentication
   - Click "REFRESH TOKEN" button
   - This ensures you have a valid token before cron starts

2. **Verify cron is working:**
   - Wait 30 minutes
   - Check Railway logs for cron execution
   - Or watch for the next automatic refresh

---

## Monitoring

### What to Look For

1. **On Application Start:**
   ```
   🚀 [Instrumentation] Starting server initialization...
   ================================================================================
   [Cron] Initializing cron jobs...
   ================================================================================
   [Cron] ✅ Token refresh job scheduled (every 30 minutes)
   [Cron] Timezone: Europe/Athens
   ================================================================================
   [Cron] Running initial token refresh check...
   ```

2. **Every 30 Minutes:**
   ```
   ================================================================================
   [Cron] Starting automatic token refresh check...
   [Cron] Time: 2025-11-13T15:30:00.000Z
   ================================================================================
   [Cron] Token expiration check:
     - Current time: 2025-11-13T15:30:00.000Z
     - Token expires at: 2025-11-13T16:15:00.000Z
     - Time until expiry: 45 minutes
     - Needs refresh? false
   [Cron] ✅ Token is still valid, no refresh needed
   ================================================================================
   ```

3. **When Token is Refreshed:**
   ```
   [Cron] 🔄 Token expired or expiring soon, refreshing...
   [Milesight] Requesting token from: https://eu-openapi.milesight.com/oauth/token
   [Cron] ✅ Token refreshed successfully!
     - New token expires at: 2025-11-13T16:30:00.000Z
     - Valid for: 3600 seconds
   ```

### Dashboard Verification

1. **Token Status:**
   - Go to: Admin → Settings → Milesight Authentication
   - "Token expires" should always show a future time (>30 min)

2. **Webhook Activity:**
   - Go to: Admin → Settings → Milesight Webhook
   - "Last Event At" should update regularly

---

## Configuration

### Changing Schedule

Edit `/src/lib/cron.ts`:

```typescript
// Current: Every 30 minutes
cron.schedule("*/30 * * * *", ...)

// Every 15 minutes (more frequent)
cron.schedule("*/15 * * * *", ...)

// Every hour (less frequent)
cron.schedule("0 * * * *", ...)
```

### Changing Buffer Time

Edit `/src/lib/cron.ts`:

```typescript
// Current: 5 minutes buffer
const bufferTime = 5 * 60 * 1000;

// 10 minutes buffer (more safety)
const bufferTime = 10 * 60 * 1000;
```

### Changing Timezone

Edit `/src/lib/cron.ts`:

```typescript
cron.schedule("*/30 * * * *", async () => {
  await refreshMilesightToken();
}, {
  timezone: "Europe/Athens", // ← Change this
});
```

---

## Benefits

| Feature | Benefit |
|---------|---------|
| **Self-Contained** | No external services or accounts needed |
| **Automatic** | Starts when app starts, no setup required |
| **Reliable** | Runs within your application process |
| **Monitored** | All logs in Railway dashboard |
| **Configurable** | Easy to adjust schedule and behavior |
| **Zero Cost** | No additional services to pay for |

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Cron not starting | Check Railway logs for initialization messages |
| Token still expires | Verify Milesight credentials are correct |
| No log messages | Ensure `src/instrumentation.ts` exists |
| Build fails | Run `npm install` to get dependencies |

---

## Testing

### Local Testing

```bash
# Run development server
npm run dev

# Watch console for:
# - Instrumentation initialization
# - Cron job scheduling
# - Initial token check
```

### Production Testing

1. Deploy to Railway
2. Check logs immediately for initialization
3. Wait 30 minutes for first execution
4. Verify token expiration time in dashboard

---

## Next Steps

1. ✅ **Push to Git** - Commit and push changes
2. ✅ **Deploy to Railway** - Let Railway auto-deploy
3. ✅ **Manually refresh token** - Get initial token
4. ✅ **Wait 30 minutes** - Verify cron executes
5. ✅ **Monitor logs** - Watch for success messages

---

## Success Criteria

You'll know it's working when:

- ✅ Build succeeds without errors
- ✅ Deployment completes successfully
- ✅ Initialization logs appear on startup
- ✅ Cron executes every 30 minutes
- ✅ Token never expires
- ✅ Webhook continues receiving data
- ✅ No manual intervention needed

---

## Support

If you encounter issues:

1. Check `AUTO_TOKEN_REFRESH.md` for detailed troubleshooting
2. Review Railway logs for error messages
3. Verify all files are committed and pushed
4. Ensure dependencies are installed (`npm install`)

---

**Your Milesight integration will now run 24/7 without token expiration issues!** 🎉

---

**Implementation Date**: November 13, 2025  
**Version**: 1.0.0  
**Technology**: node-cron v3.0.3  
**MINERVA Device Monitoring System**

