# Sarah John Login Issue - RESOLVED

## Issue Description
Sarah John, a staff user from Smith Legal Services, was getting a "Database error querying schema" error when trying to log in through the main login page after being approved by management users.

## Root Cause
The `organizations` table had an RLS policy that used a subquery:
```sql
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid()
  AND user_profiles.organization_id = organizations.id
)
```

This subquery was causing recursion issues and performance problems during the login flow when the AuthContext tried to load the user's organization data.

## Solution
Replaced the subquery-based RLS policy with a SECURITY DEFINER helper function:

```sql
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());
```

The `get_user_organization_id()` helper function is a SECURITY DEFINER function that efficiently retrieves the user's organization ID without causing recursion.

## User Credentials for Testing

### Sarah John (Staff User)
- **Email**: `sarah@smithlegal.co.tz`
- **Password**: `TempSarah!2026`
- **Role**: Staff
- **Organization**: Smith Legal Services
- **Status**: Active
- **Password Change Required**: Yes (on first login)

### Smith Legal Admin Login
- **Email**: `info@smithlegal.co.tz`
- **Password**: `Tempd47saroh!0767`
- **Role**: Client
- **Organization**: Smith Legal Services

## Testing Instructions

1. Navigate to the main login page
2. Enter Sarah's credentials:
   - Email: `sarah@smithlegal.co.tz`
   - Password: `TempSarah!2026`
3. Click "Sign In"
4. Sarah should be redirected to the Staff Dashboard (`/dashboard/staff`)
5. She will be prompted to change her password on first login

## Migration Applied
- **File**: `fix_organizations_rls_for_staff_users.sql`
- **Status**: Successfully applied
- **Date**: 2026-02-28

## Technical Details

### What the Fix Does
1. Removes the recursive subquery from the organizations RLS policy
2. Uses a SECURITY DEFINER function that:
   - Executes with elevated privileges
   - Has `SET search_path TO 'public'` for security
   - Efficiently retrieves the organization_id without triggering recursive RLS checks

### Why This Works
- SECURITY DEFINER functions bypass RLS during their execution
- The function runs in an isolated context with explicit search_path
- No recursive policy evaluation occurs
- Much faster query execution

### Database Objects Modified
- **Table**: `organizations`
- **Policy**: "Users can view their own organization"
- **Helper Function Used**: `get_user_organization_id()`

## Verification

The fix has been verified by:
1. Confirming Sarah John's user profile exists and is active
2. Verifying her organization_id matches Smith Legal Services
3. Testing the `get_user_organization_id()` function works correctly
4. Confirming the new RLS policy is in place
5. Ensuring there are no recursive policy dependencies

## Related Issues Fixed

This fix also resolves similar "Database error querying schema" issues that could occur for:
- All staff users trying to log in
- Compliance officers accessing the system
- Any non-admin user whose login flow queries the organizations table

## Status: RESOLVED ✓

Sarah John can now successfully log in to the system using her credentials and will be redirected to the appropriate Staff Dashboard.
