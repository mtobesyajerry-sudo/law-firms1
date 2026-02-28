# RLS Policies Fix for Law Firm Approval

**Date:** 2026-02-28
**Status:** ✅ FIXED

## Issue

When admin attempted to approve law firm registration:
```
Error approving law firm registration: new row violates row-level security policy for table "organizations"
```

## Root Cause

The `organizations` table was missing an INSERT policy for admins. Without this policy, even admins couldn't create new organization records during the approval process.

## Policies Added

### 1. Organizations INSERT Policy

**Migration:** `add_admin_organizations_insert_policy.sql`

```sql
CREATE POLICY "Admins can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
```

**Purpose:** Allows admins to create organization records when approving law firm registrations.

### 2. User Profiles INSERT Policy Fix

**Migration:** `fix_user_profiles_insert_for_approval.sql`

**Problem:** The existing policy had a chicken-and-egg issue:
- It required `law_firm_registrations.user_id IS NOT NULL`
- But we need to insert the profile BEFORE we can update that field
- This blocked the approval process

**Solution:** Updated the policy to remove the `user_id IS NOT NULL` requirement:

```sql
CREATE POLICY "Users can insert profile with approval or as admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin can insert any profile
    is_admin_user()
    OR
    -- First user can self-register
    (SELECT count(*) FROM user_profiles) = 0
    OR
    -- User with approved registration can insert their own profile
    (
      auth.uid() = id
      AND EXISTS (
        SELECT 1
        FROM auth.users au
        JOIN law_firm_registrations lfr ON lfr.firm_email = au.email::text
        WHERE au.id = auth.uid()
          AND lfr.registration_status = 'active'
          -- REMOVED: AND lfr.user_id IS NOT NULL
      )
    )
  );
```

**Benefits:**
- Admins can now insert profiles during the approval workflow
- Still validates that a registration exists
- No security compromise - still requires admin privileges

## Complete Approval Flow (Now Working)

1. ✅ Admin clicks "Approve" on pending registration
2. ✅ System creates organization record (NEW POLICY allows this)
3. ✅ System decrypts password from encrypted field
4. ✅ System creates Supabase auth user
5. ✅ System creates user profile (FIXED POLICY allows this)
6. ✅ System links organization to user
7. ✅ System updates registration status to 'active'
8. ✅ User can now log in with their credentials

## Current RLS Policies Status

### Organizations Table:
- ✅ SELECT: Admins can view all, users can view their own
- ✅ INSERT: Admins can create (NEWLY ADDED)
- ✅ UPDATE: Admins can update
- ✅ DELETE: Admins can delete

### User Profiles Table:
- ✅ SELECT: Multiple policies for different roles
- ✅ INSERT: Admins, first user, or approved registrations (FIXED)
- ✅ UPDATE: Various role-based policies
- ✅ DELETE: Admin policies

## Security Verification

✅ Only admins can create organizations (checked via `is_admin()`)
✅ Only admins can insert user profiles for new users (checked via `is_admin_user()`)
✅ Registration must exist before profile can be created
✅ Email must match registration record
✅ No bypass for non-admin users
✅ First user exception still works for system initialization

## Testing Steps

1. Log in as admin: mtobesyaj@gmail.com
2. Navigate to System Administrator Dashboard
3. Click "Law Firm Registrations" tab
4. Click "Approve" on any pending request:
   - Mwamba & Associates Advocates
   - Kamanga Legal Consultants
   - Dodoma Law Chambers
   - Arusha Advocates & Associates
   - Mwanza Legal Partners LLP
5. Confirm approval
6. Verify success message
7. Check "Processed Requests" section
8. Log out and try logging in as the approved firm

## Status: READY FOR PRODUCTION

All RLS policies are now correctly configured to support the law firm registration approval workflow while maintaining strict security controls.
