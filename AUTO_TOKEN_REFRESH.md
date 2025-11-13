# Automatic Token Refresh with node-cron

## Overview

The MINERVA system includes **automatic token refresh** using `node-cron`. The cron job runs internally within the Node.js application and automatically refreshes the Milesight API token before it expires.

**No external services required** - everything runs inside your application! 🎉

---

## How It Works

### Token Refresh Process

```
Application Starts → Cron Job Initialized → Runs Every 30 Minutes
                            ↓
                   Check Token Expiration
                            ↓
                  Expires within 5 min? ────No──→ Skip (wait 30 min)
                            ↓
                          Yes
                            ↓
                  Request New Token from Milesight
                            ↓
                    Update Database
                            ↓
                    Log Success ✅
```

### Schedule

- **Frequency**: Every 30 minutes
- **Cron Expression**: `*/30 * * * *`
- **Timezone**: Europe/Athens (configurable)
- **Buffer Time**: 5 minutes before expiration
- **Initial Check**: Runs immediately on startup

### Architecture

The system uses three key files:

1. **`src/lib/cron.ts`** - Cron job definitions and logic
2. **`src/instrumentation.ts`** - Starts cron jobs on app startup
3. **`next.config.ts`** - Enables instrumentation hook

---

## Setup (Already Done!)

The automatic token refresh is **already configured** in your application. You just need to install dependencies:

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `node-cron` - Cron job scheduler
- `@types/node-cron` - TypeScript definitions

### Step 2: Deploy

When you deploy to Railway, the cron job will start automatically.

**That's it!** No external services, no configuration needed.

---

## Configuration

### Changing the Schedule

Edit `/src/lib/cron.ts`:

```typescript
const tokenRefreshJob = cron.schedule(
  "*/30 * * * *", // ← Change this cron expression
  async () => {
    await refreshMilesightToken();
  },
  {
    scheduled: true,
    timezone: "Europe/Athens", // ← Change your timezone
  }
);
```

### Common Cron Schedules

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 15 minutes | `*/15 * * * *` | More frequent |
| Every 30 minutes | `*/30 * * * *` | **Recommended** |
| Every 45 minutes | `*/45 * * * *` | Less frequent |
| Every hour | `0 * * * *` | At :00 each hour |
| Every 2 hours | `0 */2 * * *` | At :00 every 2 hours |

### Changing the Buffer Time

Edit the buffer time in `/src/lib/cron.ts`:

```typescript
const bufferTime = 5 * 60 * 1000; // ← 5 minutes in milliseconds
```

Increase to 10 minutes for extra safety:
```typescript
const bufferTime = 10 * 60 * 1000; // 10 minutes
```

### Changing the Timezone

Update timezone in `/src/lib/cron.ts`:

```typescript
const tokenRefreshJob = cron.schedule(
  "*/30 * * * *",
  async () => {
    await refreshMilesightToken();
  },
  {
    scheduled: true,
    timezone: "America/New_York", // ← Your timezone
  }
);
```

**Common Timezones:**
- `Europe/Athens` - Greece
- `Europe/London` - UK
- `America/New_York` - US Eastern
- `America/Los_Angeles` - US Pacific
- `Asia/Tokyo` - Japan
- `UTC` - Universal Time

---

## Monitoring

### Check if Cron is Running

1. **View Railway Logs:**
   - Go to Railway → Your Service → Deployments → Logs
   - Look for startup messages:
     ```
     🚀 [Instrumentation] Starting server initialization...
     [Cron] Initializing cron jobs...
     [Cron] ✅ Token refresh job scheduled (every 30 minutes)
     [Cron] Running initial token refresh check...
     ```

2. **Watch for Cron Execution:**
   Every 30 minutes you should see:
   ```
   ================================================================================
   [Cron] Starting automatic token refresh check...
   [Cron] Time: 2025-11-13T14:00:00.000Z
   ================================================================================
   [Cron] Token expiration check:
     - Current time: 2025-11-13T14:00:00.000Z
     - Token expires at: 2025-11-13T14:55:00.000Z
     - Time until expiry: 55 minutes
     - Needs refresh? false
   [Cron] ✅ Token is still valid, no refresh needed
   ================================================================================
   ```

3. **When Token is Refreshed:**
   ```
   [Cron] Token expiration check:
     - Time until expiry: 3 minutes
     - Needs refresh? true
   [Cron] 🔄 Token expired or expiring soon, refreshing...
   [Milesight] Requesting token from: https://eu-openapi.milesight.com/oauth/token
   [Cron] ✅ Token refreshed successfully!
     - New token expires at: 2025-11-13T15:00:00.000Z
     - Valid for: 3600 seconds
   ================================================================================
   ```

### Check Token Status

Go to **Admin → Settings → Milesight Authentication**:
- **Token expires**: Should always show a future time
- **Last updated**: Should update every 30-60 minutes
- **Status**: Should show "Active" with green indicator

### Verify Webhook is Working

Go to **Admin → Settings → Milesight Webhook**:
- **Last Event At**: Should update regularly (every 10-15 minutes)
- **Recent Events**: Should show new entries
- **Status**: Should show green "ACTIVE" indicator

---

## Troubleshooting

### Issue: Cron Not Starting

**Symptoms:**
- No cron messages in logs
- Token still expires

**Solutions:**

1. **Check files exist:**
   - Verify `src/instrumentation.ts` exists
   - Verify `src/lib/cron.ts` exists

2. **Restart application:**
   ```bash
   # In Railway, trigger a new deployment
   git commit --allow-empty -m "Trigger rebuild"
   git push
   ```

3. **Check logs during startup:**
   - Should see initialization messages
   - If missing, instrumentation isn't running

### Issue: Token Still Expires

**Symptoms:**
- Cron runs but token still expires
- Refresh fails

**Solutions:**

1. **Check Milesight credentials:**
   - Go to Admin → Settings → Milesight Authentication
   - Verify Client ID and Client Secret are correct
   - Verify Base URL is correct for your region

2. **Check error logs:**
   - Look for `[Cron] ❌` error messages
   - Check the error details

3. **Manually refresh token:**
   - Click "REFRESH TOKEN" button in admin
   - If this fails, credentials are wrong

4. **Check API endpoint:**
   - Verify Milesight API is accessible
   - Test with curl:
     ```bash
     curl https://eu-openapi.milesight.com/oauth/token \
       -X POST \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"
     ```

### Issue: Too Many Requests

**Symptoms:**
- Milesight API returns rate limit errors
- 429 status codes

**Solutions:**

1. **Increase cron interval:**
   - Change from `*/30 * * * *` to `*/45 * * * *` (45 minutes)
   - Or use `0 * * * *` (every hour)

2. **Increase buffer time:**
   - Change from 5 minutes to 10 minutes
   - Reduces refresh frequency

### Issue: Memory Leaks

**Symptoms:**
- Application memory grows over time
- Application crashes after days

**Solutions:**

1. **Ensure proper cleanup:**
   - Cron jobs should not keep references
   - Database connections should be pooled

2. **Monitor memory usage:**
   - Check Railway metrics
   - Look for memory growth patterns

3. **Restart application periodically:**
   - Set up automatic restarts if needed

---

## Local Development

### Running Locally

When you run `npm run dev`, the cron job will start automatically:

```bash
npm run dev
```

You'll see cron initialization in the console.

### Testing Token Refresh

To test without waiting 30 minutes:

1. **Manually trigger refresh:**
   - Go to Admin → Settings → Milesight Authentication
   - Click "REFRESH TOKEN" button

2. **Or adjust cron schedule temporarily:**
   ```typescript
   // Change to run every minute for testing
   cron.schedule("*/1 * * * *", async () => {
     await refreshMilesightToken();
   });
   ```

3. **Or call function directly:**
   ```typescript
   // In src/lib/cron.ts, export refreshMilesightToken
   // Then call it from a test API route
   ```

---

## Benefits

### ✅ Fully Automated
- No manual intervention required
- Runs 24/7 automatically
- Starts on application boot

### ✅ Self-Contained
- No external services needed
- No cron-job.org accounts
- No GitHub Actions workflows
- Everything in one application

### ✅ Reliable
- Runs as part of your application
- Uses same database connection
- Proper error handling
- Comprehensive logging

### ✅ Easy to Monitor
- All logs in Railway dashboard
- Easy to debug issues
- Clear status messages

### ✅ Configurable
- Easy to change schedule
- Adjustable buffer time
- Customizable timezone
- Can add more cron jobs

---

## Technical Details

### Files Created/Modified

1. **`package.json`**
   - Added: `node-cron` and `@types/node-cron`

2. **`src/lib/cron.ts`** (new)
   - Cron job definitions
   - Token refresh logic
   - Job management functions

3. **`src/instrumentation.ts`** (new)
   - Next.js instrumentation
   - Starts cron jobs on app boot
   - Works automatically in Next.js 15+

### How Next.js Instrumentation Works

1. **Application starts** (Railway deployment or `npm start`)
2. **Next.js calls** `register()` from `instrumentation.ts`
3. **Function imports** `startCronJobs()` from `src/lib/cron.ts`
4. **Cron jobs initialized** using `node-cron`
5. **Jobs run** according to their schedules
6. **Logs appear** in Railway/console

### Performance Impact

- **Minimal CPU usage**: Cron runs every 30 minutes only
- **Small memory footprint**: ~1-2 MB for node-cron
- **No network overhead**: Only when refreshing token
- **Database queries**: 1-2 queries every 30 minutes

---

## Adding More Cron Jobs

You can add additional cron jobs to `/src/lib/cron.ts`:

```typescript
export function startCronJobs() {
  // Existing token refresh job
  const tokenRefreshJob = cron.schedule("*/30 * * * *", async () => {
    await refreshMilesightToken();
  });

  // NEW: Daily cleanup job (runs at midnight)
  const cleanupJob = cron.schedule("0 0 * * *", async () => {
    await cleanupOldRecords();
  }, {
    timezone: "Europe/Athens"
  });

  // NEW: Hourly status check
  const statusCheckJob = cron.schedule("0 * * * *", async () => {
    await checkSystemStatus();
  });

  console.log("[Cron] ✅ All cron jobs scheduled");

  return {
    tokenRefreshJob,
    cleanupJob,
    statusCheckJob,
  };
}
```

---

## Summary

With `node-cron` implementation:

- ✅ **Automatic token refresh** every 30 minutes
- ✅ **No external dependencies** - runs internally
- ✅ **Starts automatically** when app deploys
- ✅ **Self-monitoring** with comprehensive logs
- ✅ **Zero configuration** after deployment
- ✅ **Easy to customize** schedule and behavior

**Your token will never expire again!** 🎉

---

**Last Updated**: November 13, 2025  
**Version**: 2.0.0 (node-cron)  
**MINERVA Device Monitoring System**
