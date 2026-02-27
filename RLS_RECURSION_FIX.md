# RLS Infinite Recursion Fix

## Problem

The application was showing a blank white screen with the error:
```
infinite recursion detected in policy for relation "user_profiles"
```

## Root Cause

All Row Level Security (RLS) policies that checked for admin privileges were querying the `user_profiles` table directly:

```sql
-- OLD PROBLEMATIC POLICY
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- ❌ Querying user_profiles inside user_profiles policy!
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

This created infinite recursion because:
1. User tries to read their profile from `user_profiles`
2. RLS policy checks if user is admin by querying `user_profiles`
3. That query triggers the same RLS policy again
4. Infinite loop → PostgreSQL detects recursion and throws error

## Solution

Created a `SECURITY DEFINER` function that bypasses RLS when checking admin status:

```sql
CREATE OR REPLACE FUNCTION public.is_admin_direct(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Bypasses RLS
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = check_user_id
  LIMIT 1;

  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
```

Then updated all admin policies to use this function:

```sql
-- NEW FIXED POLICY
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));  -- ✅ No recursion!
```

## Tables Fixed

The following tables had their admin policies updated:

1. **user_profiles** - All admin policies (SELECT, UPDATE, DELETE)
2. **assessments** - Admin policies (SELECT, INSERT, UPDATE, DELETE)
3. **assessment_attachments** - Admin SELECT policy
4. **assessment_responses** - Admin ALL policy
5. **organizations** - Admin policies (SELECT, INSERT, UPDATE, DELETE)
6. **remediation_actions** - Admin ALL policy
7. **section_scores** - Admin ALL policy

## Migrations Applied

1. `fix_user_profiles_rls_recursion.sql` - Created `is_admin_direct()` function and fixed user_profiles policies
2. `update_all_admin_policies_to_use_is_admin_function.sql` - Updated all other table policies
3. `fix_remaining_admin_insert_policies.sql` - Fixed remaining INSERT policies

## Verification

After applying the fixes:

```sql
-- Verify no policies still query user_profiles recursively
SELECT tablename, policyname
FROM pg_policies
WHERE (qual LIKE '%FROM user_profiles%' OR with_check LIKE '%FROM user_profiles%')
AND policyname NOT LIKE '%Client%';
-- Result: Empty (all admin policies fixed)

-- Verify function is properly configured
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE proname = 'is_admin_direct';
-- Result: is_security_definer = true, volatility = stable ✅
```

## Security Considerations

### Why SECURITY DEFINER is Safe Here

The `is_admin_direct()` function uses `SECURITY DEFINER`, which means it runs with the privileges of the function creator (typically a superuser) and bypasses RLS. This is safe because:

1. **Read-Only Operation**: Function only reads data, never writes
2. **Single Purpose**: Only checks if a user is admin
3. **No Data Exposure**: Returns only true/false, not user data
4. **Input Validation**: Takes UUID parameter (type-safe)
5. **Exception Handling**: Safely handles errors by returning false

### Alternative Approaches Considered

1. **Using auth.jwt() claims** - Rejected because role is not stored in JWT by default in Supabase
2. **Storing role in auth.users metadata** - Rejected because it duplicates data and creates sync issues
3. **Creating a materialized view** - Overkill and adds complexity
4. **Recursive policy with depth limit** - PostgreSQL doesn't support this

## Testing

To test the fix:

1. **Clear browser cache and reload** - Ensure you're using the new build
2. **Check browser console** - Should have no RLS recursion errors
3. **Login as user** - Should successfully load profile
4. **Admin dashboard** - Should load without errors

## Future Improvements

Consider these enhancements for production:

1. **Caching**: Add Redis/Memcached to cache admin status checks
2. **Monitoring**: Track how often `is_admin_direct()` is called
3. **Audit Logging**: Log when admin privileges are used
4. **Role in JWT**: Configure Supabase to include role in JWT for faster checks

## Related Files

- `/tmp/cc-agent/63832966/project/supabase/migrations/fix_user_profiles_rls_recursion.sql`
- `/tmp/cc-agent/63832966/project/supabase/migrations/update_all_admin_policies_to_use_is_admin_function.sql`
- `/tmp/cc-agent/63832966/project/supabase/migrations/fix_remaining_admin_insert_policies.sql`

## Summary

The infinite recursion bug was caused by RLS policies querying the same table they were protecting. Fixed by creating a `SECURITY DEFINER` function that safely bypasses RLS when checking admin status. All admin policies across 7 tables have been updated to use this function.

**Status**: ✅ RESOLVED
**Build**: ✅ SUCCESS
**Preview**: ✅ WORKING
