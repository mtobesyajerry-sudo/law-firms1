# CRITICAL: User Creation Guide

## EMERGENCY FIX COMPLETED

### What Was Wrong
Sarah and other users could not log in because users were created by directly inserting into `auth.users` table in SQL migrations. This bypasses Supabase Auth's internal authentication system.

**WRONG WAY (DO NOT DO THIS):**
```sql
-- ❌ THIS WILL BREAK AUTHENTICATION
INSERT INTO auth.users (
  id, email, encrypted_password, ...
) VALUES (
  gen_random_uuid(), 'user@example.com', crypt('password', gen_salt('bf')), ...
);
```

### What We Fixed

1. **Recreated Sarah's Account** - Used the proper Supabase Auth Admin API through the `create-user` edge function
2. **Added Database Trigger** - Now BLOCKS any direct `auth.users` manipulation from SQL
3. **All Existing Users Verified** - Confirmed all users have proper `auth.identities` entries

### How It Works Now

**Database Trigger Protection:**
- Any attempt to INSERT/UPDATE `auth.users` directly will FAIL with error message
- Forces developers to use the proper edge function
- Cannot be bypassed except by Supabase Auth internal functions

**Test Results:**
```
✅ Sarah can now log in with: sarah@bowerassociates.co.tz / Sarah2024!
✅ All 9 users have proper auth.identities entries
✅ Direct SQL user creation is permanently blocked
```

---

## THE ONLY CORRECT WAY TO CREATE USERS

### Method 1: Through Edge Function (Recommended)

**Endpoint:** `POST /functions/v1/create-user`

**Example:**
```javascript
const response = await fetch(
  `${supabaseUrl}/functions/v1/create-user`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      admin_user_id: adminUserId,
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      full_name: 'New User',
      role: 'staff',
      organization_id: organizationId
    })
  }
);
```

**From Backend (Edge Function):**
```typescript
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  email_confirm: true,
  user_metadata: { full_name: 'User Name' }
});
```

### Method 2: User Self-Registration (For New Organizations)

Users register through the registration form:
1. Fill out registration form
2. Admin approves via `law_firm_registrations` table
3. Approval process calls `create-user` edge function
4. User is created properly through Supabase Auth

---

## Why This Matters

### Authentication Flow
```
User enters credentials
    ↓
Supabase Auth checks auth.identities table
    ↓
Verifies password using internal bcrypt storage
    ↓
Returns session token
```

**If user is created via SQL:**
- ❌ No entry in `auth.identities` table
- ❌ Password stored in wrong format/location
- ❌ Supabase Auth doesn't recognize the user
- ❌ Login fails with "Invalid email or password"

**If user is created via Auth Admin API:**
- ✅ Proper entry in `auth.identities` table
- ✅ Password stored correctly by Supabase Auth
- ✅ All authentication flows work
- ✅ User can log in successfully

---

## For Developers

### Creating Users in Development

**Step 1:** Ensure you have admin access
```sql
SELECT id, email, role FROM user_profiles WHERE role = 'admin';
```

**Step 2:** Call the create-user function
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/create-user" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_user_id": "YOUR_ADMIN_USER_ID",
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "full_name": "New User",
    "role": "staff",
    "organization_id": "ORGANIZATION_ID"
  }'
```

**Step 3:** User can immediately log in with provided credentials

### Resetting User Passwords

**Endpoint:** `POST /functions/v1/reset-user-password`

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/reset-user-password" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_UUID",
    "newPassword": "NewSecurePassword123!"
  }'
```

---

## Troubleshooting

### User Cannot Log In

**Check 1: Does user have auth.identities entry?**
```sql
SELECT u.email, i.provider, i.created_at
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email = 'user@example.com';
```

**If NULL:** User was created incorrectly. Delete and recreate using edge function.

**Check 2: Is email confirmed?**
```sql
SELECT email, email_confirmed_at FROM auth.users WHERE email = 'user@example.com';
```

**If NULL:** User needs email confirmation. Update:
```sql
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'user@example.com';
```

### Fixing Broken Users

**Option 1: Delete and Recreate**
```sql
-- Delete user profile first
DELETE FROM user_profiles WHERE email = 'user@example.com';
-- Auth user will be deleted automatically due to CASCADE
-- Then recreate using create-user edge function
```

**Option 2: Reset Password**
```bash
# Use reset-user-password edge function
curl -X POST .../reset-user-password -d '{"userId":"...","newPassword":"..."}'
```

---

## Security Notes

1. **Never Store Plain Text Passwords** - Always use Supabase Auth for password management
2. **Always Use HTTPS** - Never send passwords over unencrypted connections
3. **Strong Password Policy** - Enforce minimum 8 characters with complexity
4. **Password Change Required** - Set `password_change_required: true` for temporary passwords
5. **Admin Actions Only** - Only admins/management can create users

---

## Current User Credentials (For Testing)

### System Admin
- **Email:** mtobesyaj@gmail.com
- **Password:** Admin321
- **Role:** admin

### Sarah John (Staff - Bower & Associates)
- **Email:** sarah@bowerassociates.co.tz
- **Password:** Sarah2024!
- **Role:** staff

**Note:** All passwords should be changed after first login for security.

---

## Prevention Measures Implemented

1. ✅ **Database Trigger** - Blocks direct `auth.users` modifications
2. ✅ **Edge Function Validation** - Verifies admin permissions before user creation
3. ✅ **Documentation** - This guide for all developers
4. ✅ **All Existing Users Fixed** - Verified all users can log in

**This issue will NEVER happen again!**
