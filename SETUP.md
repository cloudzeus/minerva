# Quick Setup Guide

Follow these steps to get Minerva RBAC up and running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Setup Database

The database connection is already configured in `.env`:
- Host: 5.189.130.31:3333
- Database: minerva

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to MySQL database
npm run db:push

# Seed with demo users
npm run db:seed
```

## 3. Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 4. Login with Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **ADMIN** | admin@minerva.com | Admin123! |
| **MANAGER** | manager@minerva.com | Manager123! |
| **EMPLOYEE** | employee@minerva.com | Employee123! |

## Features to Test

### As ADMIN:
- ✅ View system dashboard with charts
- ✅ Navigate to `/admin/users` to manage users
- ✅ Create new users with different roles (via modal)
- ✅ Edit existing users (via modal)
- ✅ Activate/Deactivate users (individual or bulk)
- ✅ Delete users (individual or bulk)
- ✅ Export users to Excel
- ✅ View activity logs at `/admin/activity`
- ✅ Configure Milesight OAuth2 at `/admin/settings/milesight`
  - Save credentials and get access token
  - Test connection
  - Refresh token manually
  - View token status and expiry

### As MANAGER:
- ✅ View team dashboard
- ✅ Monitor team performance with charts
- ✅ View team members at `/manager/team`
- ✅ Access reports at `/manager/reports`

### As EMPLOYEE:
- ✅ View personal dashboard
- ✅ Check tasks at `/employee/tasks`
- ✅ View activity history at `/employee/activity`

## Troubleshooting

### If database connection fails:
```bash
# Check if you can connect to MySQL
mysql -h 5.189.130.31 -P 3333 -u root -p minerva
```

### If Prisma Client errors:
```bash
# Regenerate client
npm run db:generate
```

### If authentication issues:
- Clear browser cookies
- Check `.env` file has correct `AUTH_SECRET`
- Restart dev server

## Next Steps

1. **Try different roles**: Login with each account to see different dashboards
2. **Create users**: As ADMIN, create new users
3. **Test permissions**: Try accessing admin pages as Manager/Employee (should get 403)
4. **Explore charts**: All dashboards have interactive Recharts
5. **Check activity logs**: Every action is logged and visible to admins

## Tech Stack Summary

- **Next.js 15.4.5** - React framework
- **TypeScript** - Type safety
- **Auth.js v5** - Authentication
- **Prisma + MySQL** - Database ORM
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **TanStack Table** - Advanced data tables
- **Recharts** - Charts
- **Sonner** - Toast notifications
- **React Icons** - Colored icons
- **ExcelJS** - Excel export

## Additional Features

### Milesight Integration (ADMIN Only)
The app includes OAuth2 integration with Milesight Development Platform:

1. Navigate to: **Settings → Milesight Auth**
2. Enter your Milesight credentials
3. System automatically requests and stores access tokens
4. Tokens are refreshed automatically when needed

**Important**: This feature is only visible and accessible to ADMIN users.

Enjoy exploring Minerva RBAC! 🚀

