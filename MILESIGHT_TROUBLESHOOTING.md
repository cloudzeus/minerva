# Milesight Integration Troubleshooting

## ❌ Error: 401 "token_not_found"

```json
{
  "status": "Failed",
  "requestId": "...",
  "errCode": "token_not_found"
}
```

### What This Means

The Milesight API is rejecting the OAuth2 token request. This can happen for several reasons:

### Common Causes & Solutions

#### 1. **Incorrect Base URL**

**Check:**
- Is your Base URL correct?
- Should it include `/api` or not?
- Does it have `/uc/account` prefix?

**Common formats:**
```
✅ https://demo.milesight.com
✅ https://your-tenant.milesight.com
✅ https://api.milesight.com
❌ https://demo.milesight.com/ (trailing slash removed automatically)
```

**Fix:**
- Verify the exact base URL from Milesight documentation
- Try removing or adding path segments

#### 2. **Wrong Client ID or Client Secret**

**Check:**
- Did you copy the correct Client ID?
- Did you copy the entire Client Secret?
- Are there any extra spaces or line breaks?

**Fix:**
- Re-copy credentials from Milesight platform
- Paste into a text editor first to check for hidden characters
- Make sure caps lock is off

#### 3. **OAuth2 Endpoint Might Be Different**

The code tries multiple authentication methods:
1. JSON body request
2. Form-urlencoded
3. Basic Authentication header

**Check server logs** to see which methods were tried and what errors occurred.

#### 4. **Application Not Properly Configured in Milesight**

**Verify in Milesight Platform:**
- Application exists and is active
- OAuth2 is enabled for the application
- Client credentials are correctly generated
- Application has necessary permissions

## 🔧 Recommended Steps

### Step 1: Save Credentials First (Without Token Request)

1. Fill in all fields in the Milesight Auth settings
2. Click **"SAVE ONLY"** button (not "Save & Connect")
3. This saves your credentials without attempting to connect

### Step 2: Manually Request Token

1. After saving, click **"REFRESH TOKEN"** button
2. This will attempt to get a token with saved credentials
3. Check the error message for more details

### Step 3: Check Server Logs

Look in your terminal/console for detailed logs:
```
[Milesight] Attempting token request to: https://...
[Milesight] Client ID: xxx
[Milesight] Client Secret length: 32
[Milesight] JSON method failed, trying form-urlencoded: {...}
[Milesight] Form-urlencoded failed, trying Basic Auth: {...}
```

These logs show which authentication methods were attempted and what responses were received.

### Step 4: Verify Endpoint Exists

Test if the endpoint is accessible:

```bash
# Replace with your actual base URL
curl -X POST https://demo.milesight.com/uc/account/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

### Step 5: Contact Milesight Support

If none of the above works:
1. Save your credentials using "SAVE ONLY"
2. Contact Milesight support with:
   - Your tenant URL
   - The exact error message
   - Request clarification on the OAuth2 token endpoint format

## 🆘 Alternative: Skip OAuth2 (For Testing)

If you only need webhook functionality (not API calls):

1. **Skip Milesight Authentication entirely**
2. Go directly to **Settings → Milesight Webhook**
3. Configure only the webhook settings
4. Webhooks will work without OAuth2 tokens

The webhook endpoint (`/api/webhooks/milesight`) doesn't require OAuth2 authentication - it receives POST requests directly from Milesight.

## 📝 What The Error Means

The error `"token_not_found"` from Milesight suggests:
- The OAuth2 endpoint exists (you got a response)
- But it didn't recognize your request format or credentials
- This is a Milesight-specific error code

This is **NOT** a problem with your Minerva application - it's a communication issue with the Milesight API.

## ✅ Quick Solution

For now, use this workflow:

1. **Settings → Milesight Auth**
   - Click "SAVE ONLY" to store credentials
   - Skip the token request for now

2. **Settings → Milesight Webhook**
   - Configure webhook settings
   - Copy the webhook URL
   - Paste into Milesight platform
   - Test with "TEST WEBHOOK" button

The webhook will work independently of OAuth2 authentication!

## 🔍 Debug Checklist

- [ ] Base URL is correct (no typos)
- [ ] Client ID is correct (copy-paste from Milesight)
- [ ] Client Secret is correct (copy-paste from Milesight)
- [ ] No extra spaces or line breaks in credentials
- [ ] Application is active in Milesight platform
- [ ] OAuth2 is enabled for your application
- [ ] Check server console for detailed error logs
- [ ] Try "SAVE ONLY" first, then "REFRESH TOKEN"

## 📞 Need Help?

If you continue to experience issues:
1. Check Milesight Development Platform documentation
2. Verify the exact OAuth2 endpoint URL format
3. Contact Milesight support for API clarification
4. Share server console logs for detailed debugging

---

**Note**: The Minerva application is working correctly. The issue is with the OAuth2 handshake between your app and Milesight's servers. The troubleshooting steps above will help identify the exact cause.

