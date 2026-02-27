# First User Administrator Setup

## Overview

The system has been configured so that the first user to register automatically becomes the system administrator. This user does not need to provide organizational details during registration and gains immediate access to the admin dashboard.

## Implementation Details

### Frontend Changes

#### Auth Component (`src/components/Auth.jsx`)
- Added first-user detection using the `get_user_count()` database function
- Conditionally displays registration form fields:
  - **First User**: Shows only administrator information (name, email, password)
  - **Subsequent Users**: Shows full registration form with law firm information
- Added informational message for first user indicating they will receive admin privileges
- Direct account creation for first user (bypasses approval workflow)
- Automatic redirect to admin dashboard after first user registration

#### App Routing (`src/App.jsx`)
- Modified `RoleBasedRedirect` component to always redirect to `/admin/dashboard`
- All authenticated users now default to admin dashboard in preview mode

### Database Changes

#### Migration: `set_default_role_to_admin_for_preview`
- Set default role to 'admin' in user_profiles table
- Updated all existing users to admin role
- Modified `handle_new_user()` trigger to always create users with 'admin' role

#### Migration: `enforce_admin_dashboard_preview_mode`
- Added database comments documenting preview mode configuration
- Created `is_admin(user_id)` helper function for better performance
- Added index on role column for optimized queries
- Granted necessary permissions to authenticated users

#### Migration: `fix_infinite_recursion_in_user_profiles_policy`
- Created `get_user_count()` function to safely check if any users exist
- Granted execute permission to anonymous and authenticated users
- Enables first-user check without exposing user data

## User Registration Flow

### First User (System Administrator)
1. User visits registration page
2. System detects no existing users via `get_user_count()`
3. Registration form shows:
   - Blue info box: "You are registering as the first user and will be granted system administrator privileges"
   - Administrator Information section (name, email, password only)
   - Button text: "Create Administrator Account"
4. Upon submission:
   - Account is created immediately in Supabase Auth
   - User profile is created with 'admin' role
   - User is automatically signed in
   - Redirected to admin dashboard
5. No approval needed, immediate access granted

### Subsequent Users
1. User visits registration page
2. System detects existing users
3. Registration form shows:
   - User Information section (name, email, password)
   - Law Firm Information section (firm name, practice area, size, category)
   - Button text: "Submit Registration Request"
4. Upon submission:
   - Registration request is created in `registration_requests` table
   - Status: 'pending'
   - User must wait for admin approval
5. Admin reviews and approves/rejects request
6. User can login after approval

## Security Features

### Database Security
- Row Level Security (RLS) enabled on all tables
- Anonymous users can only:
  - Call `get_user_count()` function (returns count only, no user data)
- First user automatically receives admin privileges
- All subsequent registrations require admin approval

### Function Security
- `get_user_count()`: SECURITY DEFINER, returns only count
- `is_admin()`: SECURITY DEFINER, checks admin status efficiently
- `handle_new_user()`: SECURITY DEFINER, creates profiles automatically

## Preview Mode Configuration

The system is currently configured for preview/demo mode where:
- All users default to admin role
- First user becomes system administrator automatically
- Admin dashboard is the default view for all authenticated users

### Production Deployment Considerations

For production deployment, consider:
1. Reverting default role to 'client' instead of 'admin'
2. Implementing proper role assignment workflow
3. Adding environment variables to toggle between preview and production modes
4. Restricting admin creation to specific authorized processes
5. Implementing proper audit logging for admin actions

## Testing the First User Flow

To test the first user administrator setup:

1. Ensure the database has no users:
   ```sql
   DELETE FROM user_profiles;
   DELETE FROM auth.users;
   ```

2. Visit the registration page

3. Verify the blue info box appears indicating first user status

4. Complete registration with only basic information

5. Verify automatic login and redirect to admin dashboard

6. Test subsequent user registration to confirm approval workflow

## Database Functions Reference

### get_user_count()
```sql
SELECT public.get_user_count();
-- Returns: bigint (count of user profiles)
```

### is_admin(user_id)
```sql
SELECT public.is_admin('user-uuid-here');
-- Returns: boolean (true if user is admin)
```

## Files Modified

1. `src/components/Auth.jsx` - Registration form with first-user detection
2. `src/App.jsx` - Routing logic to default to admin dashboard
3. Database migrations:
   - `20260217210734_set_default_role_to_admin_for_preview.sql`
   - `20260217210808_enforce_admin_dashboard_preview_mode.sql`
   - `20260215153301_fix_infinite_recursion_in_user_profiles_policy.sql`

## Support

For issues or questions regarding the first user administrator setup, please refer to this documentation or contact the development team.
