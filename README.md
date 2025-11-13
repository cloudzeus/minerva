# MINERVA - Role-Based Access Control System

A modern, production-ready **Next.js 15.4.5** application with comprehensive **Role-Based Access Control (RBAC)** featuring three distinct user roles: ADMIN, MANAGER, and EMPLOYEE.

![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.1-teal)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-purple)

## 🚀 Features

### Authentication & Authorization
- ✅ **Auth.js v5** with secure credentials provider
- ✅ **JWT-based sessions** for stateless authentication
- ✅ **Bcrypt password hashing** (12 rounds)
- ✅ **Middleware-based route protection**
- ✅ **Server-side session management**

### Advanced Data Tables (TanStack Table)
- ✅ **Row selection** - Checkbox in each row to select multiple items
- ✅ **Select all** - Header checkbox to select/deselect all rows
- ✅ **Bulk actions** - Dropdown menu with actions for selected rows
  - Activate/Deactivate multiple users
  - Delete multiple users at once
- ✅ **Excel export** - Export filtered data to Excel (ExcelJS)
  - Formatted headers with styling
  - Auto-filter enabled
  - Date-stamped file names
- ✅ **Sortable columns** - Click any column header to sort
- ✅ **Resizable columns** - Drag column borders to resize
- ✅ **Column visibility** - Show/hide columns with multi-select dropdown
- ✅ **Dropdown action menus** - All row actions in organized dropdown
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Type-safe** - Full TypeScript support

### Role-Based Access Control
- 👑 **ADMIN**: Full system access, user management, activity monitoring
- 👔 **MANAGER**: Team oversight, performance tracking, employee management
- 👤 **EMPLOYEE**: Personal dashboard, task management, activity tracking

### Tech Stack
- **Framework**: Next.js 15.4.5 (App Router, Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: MySQL with Prisma ORM
- **Authentication**: Auth.js v5
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (built on Radix UI)
- **Charts**: Recharts with shadcn/ui chart components
- **Icons**: React Icons + Lucide Icons
- **Notifications**: Sonner (shadcn/ui toast)
- **Forms**: React Hook Form + Zod validation
- **Data Tables**: TanStack Table (React Table) v8
- **Excel Export**: ExcelJS (secure, no vulnerabilities)

## 📋 Prerequisites

- **Node.js** 20+ 
- **MySQL** 8.0+
- **npm** or **yarn** or **pnpm**

## 🛠️ Installation

### 1. Clone & Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Configure Environment Variables

The `.env` file is already configured with your MySQL connection:

```env
# Database
DATABASE_URL="mysql://root:Prof%4015%401f1femsk@5.189.130.31:3333/minerva"

# Auth.js v5
AUTH_SECRET="8f2e9d1c4b7a6e3f9d8c5b2a7e4f1d6c3b9e8f7a2d5c4e1f8b3a6d9c2e7f4b1a5d8c3e6f9b2a7d4c1e8f5b9a2d7c4e1f6b3a8d5c2e9f7a4b1d6c3e8f2a5d9c4b7e1f3a6d8c"
AUTH_URL="http://localhost:3000"
```

⚠️ **Important**: For production, generate a new `AUTH_SECRET` using:
```bash
openssl rand -base64 32
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed database with demo users
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

## 👥 Default User Credentials

After running the seed script, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| **ADMIN** | admin@minerva.com | Admin123! |
| **MANAGER** | manager@minerva.com | Manager123! |
| **EMPLOYEE** | employee@minerva.com | Employee123! |

## 🏗️ Project Structure

```
minerva/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Login page
│   │   ├── admin/             # Admin dashboard & user management
│   │   ├── manager/           # Manager dashboard & team management
│   │   ├── employee/          # Employee dashboard & tasks
│   │   ├── api/
│   │   │   └── auth/          # Auth.js API routes
│   │   ├── actions/           # Server actions
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page (redirects by role)
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── charts/            # Recharts components
│   │   ├── dashboard-layout.tsx
│   │   ├── role-badge.tsx
│   │   ├── role-guard.tsx
│   │   ├── user-menu.tsx
│   │   └── ...                # Other shared components
│   ├── lib/
│   │   ├── auth.ts            # Auth.js configuration
│   │   ├── auth-helpers.ts    # Auth utility functions
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── utils.ts           # Utility functions
│   ├── types/
│   │   └── next-auth.d.ts     # Auth.js type extensions
│   └── middleware.ts          # Route protection middleware
├── .env                       # Environment variables
├── components.json            # shadcn/ui configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

## 🔐 Authentication Flow

### 1. Login Process
- User submits credentials via `/login`
- Auth.js validates against MySQL database
- Password verified with bcrypt
- JWT token issued with user ID and role
- Activity logged to database
- User redirected to role-specific dashboard

### 2. Route Protection
The middleware (`src/middleware.ts`) enforces role-based access:

```typescript
const roleRoutes = [
  { prefix: "/admin", roles: [Role.ADMIN] },
  { prefix: "/manager", roles: [Role.MANAGER, Role.ADMIN] },
  { prefix: "/employee", roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN] },
];
```

### 3. Server-Side Guards
All dashboard pages use server-side authentication:

```typescript
// Example: Admin page
const user = await requireRole(Role.ADMIN);
```

## 📊 Database Schema

### User Model
- `id`: Unique identifier (cuid)
- `email`: Unique email address
- `name`: Optional user name
- `passwordHash`: Bcrypt hashed password
- `role`: Enum (ADMIN, MANAGER, EMPLOYEE)
- `isActive`: Boolean status flag
- `lastLoginAt`: Timestamp of last login
- `createdAt` / `updatedAt`: Timestamps

### ActivityLog Model
- `id`: Unique identifier
- `userId`: Foreign key to User
- `type`: Activity type enum (LOGIN, LOGOUT, USER_CREATED, etc.)
- `description`: Activity description
- `metadata`: JSON string for additional data
- `createdAt`: Timestamp

## 🎨 UI/UX Features

### Design Principles
- ✅ **Modern & Clean**: Minimalist design with focus on usability
- ✅ **Colored Icons**: Role-based color coding for better UX
  - 👑 ADMIN: Yellow/Gold
  - 👔 MANAGER: Blue
  - 👤 EMPLOYEE: Green
- ✅ **Responsive**: Mobile-first design approach
- ✅ **Accessible**: Built on Radix UI primitives
- ✅ **Dark Mode Ready**: Theme support via next-themes
- ✅ **Toast Notifications**: Sonner for elegant feedback

### Color Coding
- 🔵 **Blue**: Navigation, Info, General actions
- 🟢 **Green**: Success, Active, Completion
- 🟡 **Yellow**: Warnings, In Progress
- 🔴 **Red**: Errors, Destructive actions
- 🟣 **Purple**: Analytics, Special features

## 🚦 Available Scripts

```bash
# Development
npm run dev              # Start development server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to database (no migrations)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed database with demo data

# Build & Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
```

## 🔌 Milesight Integration (ADMIN Only)

### Part 1: Setup Milesight OAuth2 Authentication

1. **Access Settings** (ADMIN only):
   - Login as ADMIN
   - Navigate to sidebar → Settings → Milesight Auth
   - Or visit: `/admin/settings/milesight`

2. **Configure Credentials**:
   - Enter your Milesight tenant Base URL (e.g., `https://demo.milesight.com`)
   - Enter OAuth2 Client ID
   - Enter OAuth2 Client Secret
   - Toggle "Enable Integration" ON
   - Click "SAVE & CONNECT"

3. **What Happens**:
   - System validates credentials
   - Requests access token via OAuth2 client_credentials flow
   - Stores tokens securely in MySQL database
   - Displays connection status with expiry time

4. **Token Management**:
   - **Test Connection**: Verify current token is valid
   - **Refresh Token**: Manually refresh access token
   - **Disconnect**: Clear all tokens (can reconnect anytime)

5. **Security**:
   - Client Secret never sent to browser (server-side only)
   - Tokens stored in database with expiry tracking
   - Automatic validation before storage
   - Masked display in UI (••••••••)

### OAuth2 Flow

```
┌─────────────────────────────────────────────────┐
│ 1. ADMIN configures credentials in UI           │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 2. Server requests token from Milesight         │
│    POST /uc/account/api/oauth/token             │
│    grant_type=client_credentials                │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 3. Milesight returns access_token + refresh     │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 4. Tokens stored securely in MySQL              │
│    - Never exposed to client                    │
│    - Expiry tracked automatically               │
└─────────────────────────────────────────────────┘
```

### Part 2: Setup Milesight Webhook (Event Notifications)

1. **Access Webhook Settings** (ADMIN only):
   - Login as ADMIN
   - Navigate to sidebar → Settings → Milesight Webhook
   - Or visit: `/admin/settings/milesight-webhook`

2. **Configure Webhook**:
   - **Copy the Webhook URL** displayed on the page
   - In Milesight Development Platform:
     - Go to your Application → Settings
     - Find "Webhook" or "Event Notification" section
     - Paste the URL into "Callback URI" field
     - Save settings in Milesight
   - **Optional**: Set a verification token for added security
   - Enable the webhook in Minerva
   - Click "SAVE SETTINGS"

3. **Test the Webhook**:
   - Click "TEST WEBHOOK" button
   - This sends a test event to your endpoint
   - Check "Recent Events" table to see if it was received

4. **Live Indicator**:
   - **Gray badge**: Webhook disabled
   - **Blue badge**: Active but no recent activity
   - **Green pulsing badge**: Currently receiving data (shows for 10 seconds after last event)
   - Shows last event timestamp

5. **Recent Events**:
   - View last 10 webhook events received
   - See event type, device ID, device name
   - Processed status
   - Color-coded event types:
     - 🟢 device.online
     - 🔴 device.offline
     - 🟠 alarm.triggered
     - 🔵 test.webhook

### Webhook Endpoint Details

```
Endpoint: /api/webhooks/milesight
Method: POST
Content-Type: application/json

With verification token:
https://your-domain.com/api/webhooks/milesight?token=your-verification-token

Without verification token:
https://your-domain.com/api/webhooks/milesight
```

**What the endpoint does:**
1. Receives POST requests from Milesight
2. Validates verification token (if configured)
3. Stores event in database (MilesightWebhookEvent)
4. Updates last event timestamp and counter
5. Returns success response to Milesight

**Security:**
- Optional verification token
- Server-side validation
- All events logged for audit
- Rate limiting recommended for production
```

## 🔑 Key Features by Role

### ADMIN Dashboard (`/admin`)
- 📊 **System Overview**: Total users, role distribution, activity stats
- 👥 **User Management**: CRUD operations for all users
  - Create new users with email/password/role
  - Edit user details and change roles
  - Activate/Deactivate user accounts
  - Delete users (with confirmation)
  - Reset user passwords
  - Bulk actions (activate, deactivate, delete multiple)
  - Export to Excel with ExcelJS
- 📈 **Analytics**: User distribution charts, activity graphs
- 📋 **Activity Logs**: System-wide activity monitoring
- ⚙️ **Settings**: Integration configurations
  - **Milesight Authentication**: OAuth2 credential management
    - Store Client ID and Client Secret securely
    - Automatic token request and refresh
    - Connection status monitoring
    - Token expiry tracking
    - Test connection functionality
  - **Milesight Webhook**: Real-time event notifications
    - Copy-paste webhook URL for Milesight platform
    - Live indicator shows when receiving data (pulsing green)
    - Enable/disable webhook reception
    - Webhook UUID and Secret for security
    - Optional verification token for additional security
    - View recent webhook events in real-time
    - Test webhook functionality
    - Clear event history
  - **Device Management**: Full CRUD for Milesight IoT devices
    - List/search all devices from Milesight platform
    - Add new devices to Milesight application
    - View device details (SN, DevEUI, IMEI, status)
    - Edit device info (name, description, tag)
    - Delete devices from Milesight
    - Sync devices to local cache
    - Export devices to Excel
    - Advanced data table with sorting, filtering, column visibility
    - Real-time status indicators (online/offline)

### MANAGER Dashboard (`/manager`)
- 📊 **Team Overview**: Employee count, activity metrics
- 👥 **Team Management**: View all employees, activity tracking
- 📈 **Performance Reports**: Team performance analytics
- 📊 **Charts**: Weekly performance trends

### EMPLOYEE Dashboard (`/employee`)
- 📊 **Personal Stats**: Activity count, tasks, hours logged
- ✅ **Tasks**: View and manage assigned tasks
- 📋 **My Activity**: Personal activity history
- 📈 **Charts**: Personal activity visualization

## 🛡️ Security Features

### Authentication Security
- ✅ **Bcrypt Hashing**: 12 rounds for password security
- ✅ **JWT Tokens**: Stateless session management
- ✅ **HTTP-Only**: Secure cookie configuration
- ✅ **CSRF Protection**: Built into Auth.js

### Authorization Security
- ✅ **Middleware Guards**: Route-level protection
- ✅ **Server-Side Checks**: Double validation in components
- ✅ **Role Verification**: Every protected action verified
- ✅ **Activity Logging**: Audit trail for all actions

### Best Practices
- ✅ **Server Components**: Data fetching server-side only
- ✅ **Server Actions**: Mutations via server actions
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Input Validation**: Zod schemas for all forms
- ✅ **SQL Injection Prevention**: Prisma ORM parameterization

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

All dashboards, tables, and charts adapt to different screen sizes.

## 🎯 Development Best Practices

### Next.js 15+ Patterns
- ✅ **Server Components by default**: All pages are server components
- ✅ **Client Components**: Only for interactivity ("use client")
- ✅ **Server Actions**: All mutations via server actions
- ✅ **Parallel Routes**: Efficient data fetching
- ✅ **Suspense Boundaries**: Loading states (can be enhanced)

### Code Organization
- ✅ **Separation of Concerns**: Clear component boundaries
- ✅ **Reusable Components**: DRY principle throughout
- ✅ **Type Safety**: No `any` types used
- ✅ **Error Handling**: Try-catch in all async operations
- ✅ **Consistent Naming**: Clear, descriptive names

## 🚀 Deployment

### Environment Variables for Production

Update `.env` for production:
- Generate new `AUTH_SECRET`
- Update `AUTH_URL` to production domain
- Secure `DATABASE_URL` connection

### Build & Deploy

```bash
# Build for production
npm run build

# Test production build locally
npm run start
```

### Recommended Platforms
- **Vercel**: Native Next.js support
- **Railway**: Easy MySQL + Next.js deployment
- **AWS**: Full control with EC2/RDS
- **DigitalOcean**: App Platform or Droplets

### Database Migration
Note: This project uses **Prisma db push** instead of migrations as per requirements. For production:

```bash
npm run db:push
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run db:studio

# Regenerate Prisma Client
npm run db:generate
```

### Authentication Issues
- Check `AUTH_SECRET` is set correctly
- Verify `AUTH_URL` matches your domain
- Clear browser cookies if JWT issues

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js v5 Documentation](https://authjs.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📝 License

This project is created as a demonstration of RBAC implementation with Next.js 15.4.5.

## 🤝 Contributing

This is a complete, production-ready RBAC system. Feel free to extend it with:
- Two-factor authentication
- Email verification
- Password reset functionality
- Advanced user permissions
- Audit logs export
- Real-time notifications
- Advanced analytics

---

**Built with ❤️ using Next.js 15.4.5, TypeScript, Auth.js v5, Prisma, and shadcn/ui**

For questions or support, please refer to the documentation above.

