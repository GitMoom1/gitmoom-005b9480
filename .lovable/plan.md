# Plan: Fix and Audit Login/Registration System

The goal is to resolve the "Failed to fetch" errors during login and account creation, which are currently blocking users from accessing the GitMoon platform. The primary cause is an unreachable backend service, likely due to a network configuration issue or the database being in a state that prevents external API calls.

## Proposed Changes

### 1. Backend Connectivity & Infrastructure
- Verify and restore backend health using `supabase--restart` if the database is unresponsive.
- Confirm environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are correctly injected and pointing to the live instance.
- Audit RLS policies to ensure `auth.users` can be created and accessed as expected.

### 2. Authentication Logic (Frontend)
- Improve error handling in `src/routes/auth.tsx` to provide specific feedback for network failures vs. invalid credentials.
- Verify the `emailRedirectTo` logic to ensure it doesn't cause browser-side blocking during signup.

### 3. Data Integrity & Schema
- Audit the `user_roles` and `profiles` tables to ensure automatic role assignment (e.g., via triggers) isn't failing.
- Verify that the `plans` architecture is correctly linked to new user accounts upon registration.

## Technical Details
- Use `supabase--analytics_query` to check auth logs for specific rejection reasons from the Supabase API.
- Re-run browser audits with focused network interception to rule out CORS or DNS issues within the sandbox/preview environment.
- Ensure the `attachSupabaseAuth` middleware is correctly passing the JWT to server functions.
