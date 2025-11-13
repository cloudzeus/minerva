# Milesight Authentication Security Documentation

## 🔒 ADMIN-ONLY Access Control

The Milesight Authentication feature is **completely restricted to ADMIN users only** through multiple layers of security:

### Layer 1: Middleware Protection (Edge Level)
```typescript
// src/middleware.ts
const roleRoutes = [
  { prefix: "/admin", roles: [Role.ADMIN] }, // ✅ Blocks all /admin/settings/* routes
  // ...
];
```

**What it does:**
- Intercepts ALL requests to `/admin/settings/milesight`
- Checks user role BEFORE the page even loads
- Redirects non-ADMIN users to `/unauthorized`
- Happens at the edge (fastest possible check)

### Layer 2: Server-Side Page Guard
```typescript
// src/app/admin/settings/milesight/page.tsx
export default async function MilesightSettingsPage() {
  // This component uses DashboardLayout with requireRole(Role.ADMIN)
  return <DashboardLayout requiredRole={Role.ADMIN}>...</DashboardLayout>
}
```

**What it does:**
- Server component checks authentication on every render
- Calls `requireRole(Role.ADMIN)` which redirects if not ADMIN
- Happens server-side (cannot be bypassed by client)

### Layer 3: Server Action Guards
```typescript
// src/app/actions/milesight.ts
export async function saveMilesightSettings(formData: FormData) {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY
  // ... rest of the function
}
```

**What it does:**
- EVERY server action checks role before executing
- Functions: saveMilesightSettings, refreshMilesightAccessToken, testMilesightConnection, disconnectMilesight
- All call `requireRole(Role.ADMIN)` at the start
- Prevents API abuse even if someone bypasses UI

### Layer 4: UI Visibility
```typescript
// src/components/app-sidebar-new.tsx
const menuStructure = {
  [Role.ADMIN]: {
    groups: [
      // ... other groups
      {
        label: "Settings",
        links: [{ href: "/admin/settings/milesight", ... }]
      }
    ]
  },
  [Role.MANAGER]: {
    // NO Settings group - won't see the menu item
  },
  [Role.EMPLOYEE]: {
    // NO Settings group - won't see the menu item
  }
}
```

**What it does:**
- Settings menu group only exists in ADMIN menu structure
- MANAGER and EMPLOYEE users never see "Settings" in sidebar
- Clean UI - no confusing disabled/hidden items

## 🔐 Data Security

### Client Secret Protection
```typescript
// NEVER sent to browser
async function getMilesightSettings() {
  const settings = await prisma.milesightSettings.findFirst();
  return {
    ...settings,
    clientSecret: "••••••••", // Masked for security
  };
}
```

**Security measures:**
- ✅ Client Secret stored in MySQL database only
- ✅ Never included in page props or API responses
- ✅ Masked with `••••••••` in UI
- ✅ Only sent back to server during save (server-side validation)
- ✅ If unchanged, existing secret is preserved

### Token Storage
```typescript
model MilesightSettings {
  accessToken           String?   @db.Text  // Server-side only
  refreshToken          String?   @db.Text  // Server-side only
  accessTokenExpiresAt  DateTime?           // Expiry tracking
}
```

**Security measures:**
- ✅ Tokens stored in MySQL (server-side)
- ✅ Never exposed to client unnecessarily
- ✅ Only shown in masked form (first 20 chars + ...)
- ✅ Expiry tracked automatically
- ✅ Can be cleared via "Disconnect" button

## 🚫 What MANAGER and EMPLOYEE Users See

### Sidebar Navigation
```
MANAGER sidebar:
  - Dashboard
  - Team ▼
    - Team Members
    - Reports
  ❌ NO Settings group

EMPLOYEE sidebar:
  - Dashboard
  - My Work ▼
    - My Tasks
    - My Activity
  ❌ NO Settings group
```

### If They Try Direct URL Access
```
MANAGER tries: /admin/settings/milesight
→ Middleware catches it
→ Redirected to: /unauthorized

EMPLOYEE tries: /admin/settings/milesight
→ Middleware catches it
→ Redirected to: /unauthorized
```

## ✅ Verification Checklist

### Test ADMIN Access
- [x] Login as ADMIN
- [x] See "Settings" group in sidebar
- [x] Click "Milesight Auth"
- [x] Can access `/admin/settings/milesight`
- [x] Can save credentials
- [x] Can test connection
- [x] Can refresh token
- [x] Can disconnect

### Test MANAGER Access (Should Fail)
- [x] Login as MANAGER
- [x] "Settings" group NOT visible in sidebar
- [x] Direct URL `/admin/settings/milesight` → Redirected to `/unauthorized`
- [x] Cannot call server actions (role check fails)

### Test EMPLOYEE Access (Should Fail)
- [x] Login as EMPLOYEE
- [x] "Settings" group NOT visible in sidebar
- [x] Direct URL `/admin/settings/milesight` → Redirected to `/unauthorized`
- [x] Cannot call server actions (role check fails)

## 🛡️ Security Best Practices Implemented

1. **Defense in Depth**: Multiple security layers (middleware + server guards + action guards)
2. **Principle of Least Privilege**: Only ADMIN can access integration settings
3. **Secure by Default**: Client secrets and tokens never exposed to client
4. **Server-Side Validation**: All critical operations validated server-side
5. **Audit Trail**: All Milesight setting changes logged to ActivityLog
6. **Token Expiry**: Automatic expiry tracking and refresh mechanism
7. **Type Safety**: Full TypeScript coverage prevents common errors

## 📝 Summary

**The Milesight Authentication feature is completely secure and ADMIN-ONLY.**

No MANAGER or EMPLOYEE user can:
- ❌ See the Settings menu in sidebar
- ❌ Access the settings page via URL
- ❌ Call any Milesight server actions
- ❌ View or modify OAuth2 credentials
- ❌ Access or refresh tokens

Only ADMIN users have full control over the Milesight integration configuration.

