# Milesight Webhook Security Guide

## 🔒 Three-Layer Security System

The Milesight webhook endpoint supports three independent security methods that can be used separately or combined for maximum security.

## 1️⃣ Webhook UUID

### What It Is
- Auto-generated UUID when webhook settings are first created
- Unique identifier for this specific webhook configuration
- Example: `550e8400-e29b-41d4-a716-446655440000`

### How to Use
Include in webhook request headers:
```bash
curl -X POST https://your-domain.com/api/webhooks/milesight \
  -H "X-Webhook-UUID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"device.online",...}'
```

### When It's Validated
- Webhook endpoint checks `X-Webhook-UUID` header
- If provided, must match stored UUID
- If not provided, validation is skipped (unless secret/token is used)

### Security Level: 🟡 Medium
- Prevents accidental webhook delivery to wrong endpoint
- UUID is visible in UI (not truly secret)
- Best combined with other methods

## 2️⃣ Webhook Secret

### What It Is
- Auto-generated cryptographic secret (cuid)
- Used for signature verification
- Example: `clxyz123abc456def789`

### How to Use
Include in webhook request headers:
```bash
curl -X POST https://your-domain.com/api/webhooks/milesight \
  -H "X-Webhook-Secret: clxyz123abc456def789" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"alarm.triggered",...}'
```

### When It's Validated
- Webhook endpoint checks `X-Webhook-Secret` header
- If provided, must match stored secret
- If not provided, validation is skipped

### Security Level: 🟠 Medium-High
- Secret is auto-generated (hard to guess)
- Visible in UI (treat as sensitive)
- Recommended for production webhooks

## 3️⃣ Verification Token (Optional)

### What It Is
- Custom token you define in settings
- Added as URL query parameter
- Example: `myCustomToken123`

### How to Use
Include in webhook URL:
```
https://your-domain.com/api/webhooks/milesight?token=myCustomToken123
```

Or in curl:
```bash
curl -X POST 'https://your-domain.com/api/webhooks/milesight?token=myCustomToken123' \
  -H "Content-Type: application/json" \
  -d '{"eventType":"device.offline",...}'
```

### When It's Validated
- Webhook endpoint checks `token` query parameter
- Only validates if verification token is configured
- If not configured, this check is skipped

### Security Level: 🟡 Medium
- Easy to implement and use
- Token visible in URL (less secure than headers)
- Good for simple setups

## 🛡️ Recommended Security Configurations

### Development/Testing
```
✅ Enable webhook
✅ Use generated UUID and Secret (displayed in UI)
✅ No verification token needed
```

Milesight webhook should send:
```
Headers:
  X-Webhook-UUID: <your-uuid>
  X-Webhook-Secret: <your-secret>
```

### Production (Maximum Security)
```
✅ Enable webhook
✅ Use Webhook UUID (header validation)
✅ Use Webhook Secret (header validation)
✅ Add custom Verification Token (query param)
✅ Consider adding IP whitelist (future enhancement)
```

Milesight webhook should send:
```
URL: https://your-domain.com/api/webhooks/milesight?token=prod-token-xyz
Headers:
  X-Webhook-UUID: <your-uuid>
  X-Webhook-Secret: <your-secret>
  Content-Type: application/json
```

### Simple Setup (Minimal Security)
```
✅ Enable webhook
❌ No verification token
❌ No headers
```

URL only:
```
https://your-domain.com/api/webhooks/milesight
```

**Warning**: Anyone with the URL can send webhooks. Recommended only for testing.

## 📋 Security Validation Flow

```
┌─────────────────────────────────────────┐
│ Webhook POST Request Received           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Check: Is webhook enabled?              │
│ If NO → Return 403 Forbidden            │
└────────────┬────────────────────────────┘
             │ YES
             ▼
┌─────────────────────────────────────────┐
│ Check: Verification Token (query param) │
│ If configured AND doesn't match         │
│ → Return 401 Unauthorized               │
└────────────┬────────────────────────────┘
             │ PASS or SKIP
             ▼
┌─────────────────────────────────────────┐
│ Check: X-Webhook-Secret header          │
│ If provided AND doesn't match           │
│ → Return 401 Unauthorized               │
└────────────┬────────────────────────────┘
             │ PASS or SKIP
             ▼
┌─────────────────────────────────────────┐
│ Check: X-Webhook-UUID header            │
│ If provided AND doesn't match           │
│ → Return 401 Unauthorized               │
└────────────┬────────────────────────────┘
             │ PASS or SKIP
             ▼
┌─────────────────────────────────────────┐
│ ✅ All checks passed                    │
│ → Process webhook event                 │
│ → Store in database                     │
│ → Return 200 Success                    │
└─────────────────────────────────────────┘
```

## 🧪 Testing Security

### Test Without Security (Should Work)
```bash
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","deviceId":"001"}'
```

### Test With Webhook Secret (Should Work)
```bash
# Replace with your actual secret from UI
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: clxyz123abc456def789" \
  -d '{"eventType":"test","deviceId":"002"}'
```

### Test With Wrong Secret (Should Fail - 401)
```bash
curl -X POST http://localhost:3000/api/webhooks/milesight \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong-secret" \
  -d '{"eventType":"test","deviceId":"003"}'
```

### Test With All Security Features
```bash
curl -X POST 'http://localhost:3000/api/webhooks/milesight?token=my-token' \
  -H "Content-Type: application/json" \
  -H "X-Webhook-UUID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Webhook-Secret: clxyz123abc456def789" \
  -d '{"eventType":"test","deviceId":"004"}'
```

## 🔑 Where to Find Your Credentials

### In Minerva UI:

**Settings → Milesight Webhook** page shows:

1. **Webhook UUID Card**:
   - Auto-generated UUID
   - Copy-paste for headers

2. **Webhook Secret Card**:
   - Auto-generated secret
   - Copy-paste for headers

3. **Verification Token Field**:
   - Optional custom token
   - Set in the form

## 🎯 Best Practices

### ✅ DO:
- Use Webhook Secret in production
- Keep secret secure (don't commit to git)
- Rotate secrets periodically (regenerate webhook settings)
- Monitor failed authentication attempts
- Use HTTPS in production

### ❌ DON'T:
- Share webhook secret publicly
- Use verification token alone in production
- Disable webhook when not in use
- Ignore authentication failures in logs

## 🔄 Rotating Secrets

To rotate webhook credentials:

1. **In Milesight Platform**: Update webhook configuration
2. **In Minerva**: 
   - Current implementation auto-generates on first save
   - To regenerate: Clear webhook settings and reconfigure
   - Future enhancement: Add "Regenerate Secret" button

## 📊 Monitoring

Check webhook security in logs:
```
[Milesight Webhook] Invalid verification token
[Milesight Webhook] Invalid webhook secret
[Milesight Webhook] Invalid webhook UUID
```

These indicate someone is trying to send webhooks with wrong credentials.

---

**Security is layered** - use multiple methods for maximum protection! 🛡️

