# Supabase RLS Policy Fix Guide

Your login pages are hanging because of RLS (Row Level Security) policy issues causing infinite recursion or circular dependencies in your database queries.

## Quick Fix Steps

### Option 1: Run the SQL Fix (Recommended)

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project (URL: hgxwtwdvklcytmtsckpa.supabase.co)

2. **Open the SQL Editor**
   - In the left sidebar, click "SQL Editor"
   - Click "New Query"

3. **Run the fix**
   - Open the file `fix-rls-policies.sql` in this directory
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)

4. **Verify the fix**
   - Check that the query completes successfully
   - You should see "Success. No rows returned" or similar message

5. **Test your application**
   - Refresh your browser
   - Try logging in again at http://localhost:5173/login
   - Try admin login at http://localhost:5173/admin/login

### Option 2: Temporarily Disable RLS (Quick Test Only)

**⚠️ WARNING: This is only for testing! It will expose all data to all authenticated users!**

If you need to quickly test if RLS is the issue:

1. Open Supabase SQL Editor
2. Run this SQL:

```sql
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE travel_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

3. Test login
4. If login works, the issue is definitely RLS policies
5. **IMMEDIATELY re-enable RLS using Option 1** before deploying to production

## What Was Fixed

The original RLS policies likely had one of these issues:

1. **Circular Dependencies**: Policy on `guests` table references `invites` table, and policy on `invites` references `guests`, creating a loop
2. **Complex Joins**: Policies with complex joins that Postgres can't optimize
3. **Missing Indexes**: Queries in policies that aren't indexed properly

The new policies:
- ✅ Use simple, direct queries without circular references
- ✅ Minimize subquery complexity
- ✅ Follow best practices for RLS performance
- ✅ Maintain security while allowing necessary access

## Troubleshooting

### Still having issues after running the fix?

1. **Check for typos in table/column names**
   ```sql
   -- Run this to see your actual table structure
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. **Check for existing policies**
   ```sql
   -- Run this to see all current policies
   SELECT schemaname, tablename, policyname, cmd, roles
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Check RLS status**
   ```sql
   -- Run this to see which tables have RLS enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

### Console still shows CORS errors?

The CORS error for the `authenticate` edge function is a separate issue:

1. **Option A: Remove the edge function call**
   - If you're not using custom authentication, you don't need this
   - The current code doesn't call this function, so this error might be from browser cache

2. **Option B: Fix the edge function**
   - Go to Supabase Dashboard → Edge Functions
   - Check if `authenticate` function exists
   - If it doesn't exist, that's fine - ignore the CORS error
   - If it exists but has issues, you can delete it

### Queries still timeout after 10 seconds?

1. Check your Supabase project status (might be paused/sleeping)
2. Check your internet connection
3. Try the Supabase Dashboard directly to verify database is accessible
4. Look at Supabase logs: Dashboard → Logs → Postgres Logs

## Testing Checklist

After applying the fix, test these scenarios:

- [ ] Regular user login at `/login`
- [ ] Admin login at `/admin/login`
- [ ] View wedding pages as logged-in user
- [ ] View admin dashboard as admin
- [ ] Submit RSVP
- [ ] View guest data in admin panel

## Need More Help?

If you're still stuck:

1. Check the browser console for specific error messages
2. Check Supabase Dashboard → Logs for database errors
3. Make sure your test users exist in the database
4. Verify your Supabase API keys are correct in `client/utils/supabase.ts`

## Production Deployment

Before deploying to production:

1. ✅ Verify all RLS policies are enabled
2. ✅ Test all user flows (login, RSVP, admin access)
3. ✅ Review all policies to ensure they match your security requirements
4. ✅ Never disable RLS in production
