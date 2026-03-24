# Community Platform - Frontend

Next.js frontend application for the Community Platform with full authentication flow.

## Features

- ✅ User signup with role selection
- ✅ Email verification system
- ✅ Login/logout functionality  
- ✅ Password reset flow (forgot password + reset)
- ✅ Protected dashboard with user profile
- ✅ Responsive design with Tailwind CSS
- ✅ Toast notifications for user feedback
- ✅ Role-based access control

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Home page | Public |
| `/signup` | User registration | Public |
| `/login` | User login | Public |
| `/verify-email?token=xxx` | Email verification | Public |
| `/forgot-password` | Request password reset | Public |
| `/reset-password?token=xxx` | Reset password | Public |
| `/resend-verification` | Resend verification email | Public |
| `/dashboard` | User dashboard | Protected |

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available User Roles

- `STUDENT` - Auto-verified after email confirmation
- `COUNSELOR` - Requires email + admin verification
- `ALUMNI` - Requires email + admin verification
- `ADMIN` - Requires email + admin verification
- `SERVICE_PROVIDER` - Requires email + admin verification

## Authentication Flow

### Signup Flow
1. User fills signup form
2. Account created, verification email sent
3. User clicks link in email
4. Email verified
   - **Students**: Can login immediately
   - **Others**: Must wait for additional verification

### Login Flow
1. User enters credentials
2. System checks:
   - Email verified
   - Account verified (for non-students)
3. JWT token issued
4. Redirect to dashboard

### Password Reset Flow
1. User requests reset via email
2. Reset link sent to email
3. User clicks link, enters new password
4. Password updated, auto-login

## API Integration

All API calls are in `src/lib/api.ts`:

```typescript
import { authAPI } from '@/lib/api';

// Signup
await authAPI.signup({ name, email, password, role });

// Login
await authAPI.login({ email, password });

// Verify Email
await authAPI.verifyEmail(token);

// Get Profile
await authAPI.getProfile();
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Home page
│   │   ├── signup/page.tsx          # Signup
│   │   ├── login/page.tsx           # Login
│   │   ├── verify-email/page.tsx    # Email verification
│   │   ├── forgot-password/page.tsx # Forgot password
│   │   ├── reset-password/page.tsx  # Reset password
│   │   ├── dashboard/page.tsx       # Dashboard (protected)
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── lib/
│   │   └── api.ts                   # API service
│   └── types/
│       └── index.ts                 # TypeScript types
├── .env.local                       # Environment variables
└── package.json
```

## Building for Production

```bash
npm run build
npm run start
```

## Notes

- All protected routes check for JWT token in localStorage
- Token is automatically added to API requests via Axios interceptor
- User data is stored in localStorage after login
- Email verification links expire after 24 hours
- Password reset links expire after 1 hour
