# Supabase Authentication Setup & Testing Guide

## Current Status
✅ Supabase client helpers created (`lib/supabase/client.ts` and `lib/supabase/server.ts`)
✅ Redux auth slice updated to use Supabase
✅ Login/Register forms wired to Supabase
✅ AuthProvider syncs with Supabase auth state
✅ API routes use Supabase for authorization
✅ Environment variables configured

## Prerequisites

### 1. Supabase Project Setup
Your Supabase project is configured at: `https://urqfxhjxvccniglcxxku.supabase.co`

### 2. Required Environment Variables
All environment variables are already set in `.env.local`:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### 3. Supabase Auth Configuration
You need to configure your Supabase project's authentication settings:

#### Option A: Disable Email Confirmation (for development)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/urqfxhjxvccniglcxxku
2. Navigate to **Authentication** → **Providers** → **Email**
3. **DISABLE** "Confirm email" toggle
4. Save changes

This allows immediate login after registration without email verification.

#### Option B: Use Email Confirmation (production-like)
Keep email confirmation enabled, but you'll need to:
1. Check your email inbox for confirmation links after registration
2. Click the confirmation link before you can log in

### 4. Set Up User Metadata for Roles
Supabase stores the user `role` in `user_metadata`. This is automatically handled during registration.

## Testing the Login Flow

### Step 1: Start the Development Server
```bash
npm run dev
```

Server should start at: http://localhost:3000

### Step 2: Test Supabase Connection
Visit: http://localhost:3000/api/auth/test-supabase

You should see:
```json
{
  "success": true,
  "message": "Supabase connection configured",
  "url": "https://urqfxhjxvccniglcxxku.supabase.co",
  "anonKeyPrefix": "eyJhbGciOiJIUzI1NiI..."
}
```

### Step 3: Register a Test User

#### Register as Interviewee (default):
1. Go to: http://localhost:3000/auth/register
2. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123` (min 8 chars)
   - Confirm Password: `password123`
3. Click "Create Account"
4. **If email confirmation is disabled**: You'll be redirected to `/interviewee`
5. **If email confirmation is enabled**: Check your email and click the confirmation link

#### Register as Interviewer:
1. Go to: http://localhost:3000/auth/register?role=interviewer
2. Fill in the form
3. Follow same steps as above
4. You'll be redirected to `/interviewer`

### Step 4: Test Login
1. Go to: http://localhost:3000/auth/login
2. Enter the email and password you registered with
3. Click "Sign In"
4. You should be redirected based on your role:
   - **Interviewee** → `/interviewee`
   - **Interviewer** → `/interviewer`

### Step 5: Test Protected Routes
- Try accessing `/interviewer` without logging in → should redirect to login
- Try accessing `/interviewee` without logging in → should redirect to login
- Log in as an interviewee and try to access `/interviewer` → should see "Access Denied"

## Common Issues & Solutions

### Issue 1: "Invalid email or password" on first login
**Cause**: Email confirmation is enabled in Supabase
**Solution**: 
- Check your email for the confirmation link OR
- Disable email confirmation in Supabase dashboard

### Issue 2: "Supabase env vars missing" error
**Cause**: Environment variables not loaded
**Solution**:
1. Verify `.env.local` exists in project root
2. Restart the dev server: `npm run dev`
3. Check that `.env.local` is not in `.gitignore`

### Issue 3: User metadata (role) not saved
**Cause**: Supabase user metadata configuration
**Solution**:
The registration code properly sets `user_metadata.role`. Verify in Supabase:
1. Go to Authentication → Users
2. Click on a user
3. Check "User Metadata" section for `role` field

### Issue 4: Redirects not working after login
**Cause**: React Router navigation issue
**Solution**: Check browser console for errors and ensure:
- AuthProvider is wrapping the app
- Redux store is properly configured
- User role is correctly set in metadata

### Issue 5: Cookie/Session persistence issues
**Cause**: Browser cookie settings or Supabase session configuration
**Solution**:
- Clear browser cookies for localhost
- Check browser console for cookie warnings
- Ensure cookies are enabled in browser

## Debugging Tips

### Check Supabase Session
Add this to any client component:
```typescript
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = getSupabaseBrowserClient()
const { data } = await supabase.auth.getSession()
console.log('Current session:', data.session)
console.log('Current user:', data.session?.user)
console.log('User metadata:', data.session?.user.user_metadata)
```

### Check Redux State
Open Redux DevTools in browser to inspect:
- `state.auth.user` - current user object
- `state.auth.isLoading` - loading state
- `state.auth.error` - error messages
- `state.auth.isInitialized` - initialization status

### Check Server-Side Auth
In any server component or API route:
```typescript
import { getSupabaseServerClient } from '@/lib/supabase/server'

const supabase = await getSupabaseServerClient()
const { data } = await supabase.auth.getUser()
console.log('Server-side user:', data.user)
```

## File Structure

```
lib/
├── supabase/
│   ├── client.ts          # Browser Supabase client
│   └── server.ts          # Server Supabase client
├── auth/
│   ├── server.ts          # Server auth helpers (getCurrentUser, requireAuth, etc.)
│   └── middleware.ts      # Middleware auth helpers
store/
└── slices/
    └── auth.ts            # Redux auth slice with Supabase integration
components/
└── auth/
    ├── LoginForm.tsx      # Login UI
    ├── RegisterForm.tsx   # Registration UI
    └── AuthProvider.tsx   # Auth state provider
app/
├── auth/
│   ├── login/page.tsx     # Login page
│   └── register/page.tsx  # Register page
└── api/
    └── auth/
        └── test-supabase/route.ts  # Test endpoint
```

## Next Steps

1. **Configure Supabase Email Settings**: 
   - Disable email confirmation for dev (recommended)
   - OR set up email templates for production

2. **Test the Full Flow**:
   - Register a new user
   - Log in
   - Navigate to protected routes
   - Log out
   - Try to access protected routes (should redirect to login)

3. **Add Additional Features** (optional):
   - Password reset flow
   - Email verification reminders
   - Social auth providers (Google, GitHub, etc.)
   - Role-based access control refinements

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for server errors
3. Verify environment variables are set correctly
4. Check Supabase dashboard for auth logs
5. Review this guide's "Common Issues & Solutions" section
