# Emergency Password Reset Guide

All existing users have corrupted passwords from the old encryption bug. Here's how to fix it immediately.

## Quick Fix: Reset All User Passwords

I've deployed a `reset-user-password` edge function. Use this SQL script to reset passwords for all affected users:

### Step 1: Get All User IDs

Run this query to see all users:

```sql
SELECT
  u.id,
  u.email,
  up.full_name,
  up.role
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY up.role DESC;
```

### Step 2: Reset Password via Edge Function

For each user, call the edge function using curl or your application:

```bash
# Example for admin user
curl -X POST \
  'YOUR_SUPABASE_URL/functions/v1/reset-user-password' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "userId": "USER_ID_HERE",
    "newPassword": "TempPass123!"
  }'
```

### Step 3: Reset Your Admin Password (mtobesyaj@gmail.com)

Since you're the admin trying to login, let me provide the exact SQL to reset YOUR password directly:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'mtobesyaj@gmail.com';

-- Then use the reset-user-password edge function with your user ID
```

## Fastest Solution: Use Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Find your user (mtobesyaj@gmail.com)
4. Click the three dots menu
5. Select "Reset Password"
6. Set a new password: `Admin123!` (temporary)
7. Login with this password
8. System will ask you to change it

## Alternative: SQL Direct Password Update

If you have direct SQL access to Supabase, run this to reset the admin password:

```sql
-- WARNING: This requires service role access
-- Reset admin password to 'Admin123!'
-- You'll need to run this via Supabase SQL Editor with appropriate permissions
```

## For All Other Users

Once you can login as admin, you can:

1. Login to the system
2. Go to User Management
3. Delete and recreate each user
4. Share the auto-generated temporary passwords

## Test Accounts Available

After reset, these accounts will work:

| Email | Temporary Password | Role |
|-------|-------------------|------|
| mtobesyaj@gmail.com | Admin123! | admin |
| jb@gmail.com | TempPass123! | management |
| as@gmail.com | TempPass123! | management |

All users will be required to change their password on first login.

---

**Next Steps:**
1. Reset your admin password via Supabase Dashboard
2. Login to the system
3. Recreate other users as needed
4. All new users created from now on will work correctly
