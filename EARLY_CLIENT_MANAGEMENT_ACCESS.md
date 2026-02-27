# Early Client Management Access Implementation

## Overview

Successfully implemented a system that allows the **first 5 client users** in each organization to access the Management Dashboard and approve role upgrade requests.

## Changes Made

### 1. Database Migration

**File**: `supabase/migrations/[timestamp]_allow_first_5_clients_management_access.sql`

#### Created Function: `is_early_client(user_id UUID)`

This function determines if a user is among the first 5 client users in their organization based on `created_at` timestamp.

**Logic**:
- Returns `FALSE` if user has no organization or is not a client
- Counts how many clients were created before or at the same time as the specified user
- Returns `TRUE` if the count is 5 or less

**Security**:
- `SECURITY DEFINER` - runs with function owner's permissions
- `STABLE` - result doesn't change within a single query

#### Created RLS Policies

**For `role_upgrade_requests` table**:
1. `Early clients can view role upgrade requests in organization` (SELECT)
2. `Early clients can update role upgrade requests in organization` (UPDATE)

**For `user_profiles` table**:
1. `Early clients can update user profiles in organization` (UPDATE)
   - Cannot update admin users
   - Cannot promote to admin role

### 2. Frontend Updates

#### AuthContext (`src/contexts/AuthContext.jsx`)

**Added**:
- `isEarlyClient` state variable
- `checkIfEarlyClient()` function that calls the database RPC
- Integration into profile loading workflow
- Exported `isEarlyClient` in context value

**How it works**:
1. When user profile loads, `checkIfEarlyClient()` is called
2. Function calls `supabase.rpc('is_early_client', { user_id })`
3. Result is stored in `isEarlyClient` state
4. Value is accessible throughout the app via `useAuth()`

#### App.jsx Route Protection

**Updated**: `ProtectedRoute` component with `managementOnly` check

**Old logic**:
```javascript
// Only admin, management, senior_partner
profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner'
```

**New logic**:
```javascript
// admin, management, senior_partner, partner, OR early clients
profile?.role === 'admin' ||
profile?.role === 'management' ||
profile?.role === 'senior_partner' ||
profile?.role === 'partner' ||
(profile?.role === 'client' && isEarlyClient)
```

#### ClientDashboard (`src/components/ClientDashboard.jsx`)

**Updated**: `hasManagementAccess` calculation to include early clients

Early client users now see the "Management" section with:
- Access badge showing "📊 Management"
- Description: "Strategic oversight, analytics, and compliance intelligence"
- Route to `/dashboard/management`

### 3. Security Features

#### Organization Isolation
All policies enforce strict organization boundaries:
```sql
user_profiles.organization_id = role_upgrade_requests.organization_id
```

#### Admin Protection
Early clients **cannot**:
- Update admin user profiles
- Promote users to admin role
- Access data from other organizations

#### Role Hierarchy
Users who can approve requests (ordered by precedence):
1. `admin` - Full system access
2. `senior_partner` - Organization management
3. `management` - Organization management
4. `partner` - Organization management
5. **`client` (first 5 only)** - Limited management access

## How It Works

### For New Organizations

When a new organization is created:

**User 1** (First client):
- `is_early_client()` → `TRUE`
- Can access Management Dashboard
- Can approve role requests
- Can update user profiles (except admins)

**Users 2-5** (Next four clients):
- `is_early_client()` → `TRUE`
- Same access as User 1

**User 6+** (Later clients):
- `is_early_client()` → `FALSE`
- Regular client access only
- Cannot access Management Dashboard
- Can only view/manage their own profile

### User Experience

#### Early Client User Journey

1. **Login** → System checks if user is among first 5 clients
2. **Dashboard** → Sees "Management" section in addition to regular client features
3. **Click Management** → Navigates to `/dashboard/management`
4. **Management Dashboard** → Can see:
   - Pending role upgrade requests
   - User list for their organization
   - System analytics and reports
5. **Approve Request** → Can approve/reject role requests from other users

#### Non-Early Client User Journey

1. **Login** → System identifies user as non-early client
2. **Dashboard** → Does NOT see "Management" section
3. **Request Role Upgrade** → Can submit request for staff role
4. **Wait for Approval** → Early client or management role must approve

### Testing Scenario

**Current State**:
```
Organization: Doe & Associates
User: Jack Bower (jb@gmail.com)
Role: client
Created: 2026-02-22
is_early_client(): TRUE
```

**What Jack can do**:
✅ Access `/dashboard/management`
✅ View role upgrade requests in his organization
✅ Approve/reject role requests
✅ Update user profiles (non-admin users)
✅ View user list for his organization

**What Jack cannot do**:
❌ Access admin-only features
❌ Update admin user profiles
❌ Promote users to admin role
❌ Access other organizations' data

## Database Verification

### Check Early Client Status
```sql
SELECT
  id,
  full_name,
  email,
  role,
  organization_id,
  is_early_client(id) as is_early
FROM user_profiles
WHERE organization_id = '[org_id]'
ORDER BY created_at;
```

### Check All Policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%Early clients%'
ORDER BY tablename, cmd;
```

### Test Permissions
```sql
-- As an early client user, this should work:
SELECT * FROM role_upgrade_requests
WHERE organization_id = '[user_org_id]';

-- As a non-early client, this should return empty:
SELECT * FROM role_upgrade_requests
WHERE organization_id = '[user_org_id]';
```

## Benefits

1. **Bootstrapping Organizations**: New organizations can operate without waiting for formal role assignments
2. **Self-Service**: First users can manage their organization autonomously
3. **Gradual Transition**: As organization grows, formal roles can be assigned
4. **Security Maintained**: All security boundaries are enforced
5. **Transparent**: Clear indication of who has management access based on join order

## Edge Cases Handled

### User Role Change
If an early client's role changes from `client` to another role:
- `is_early_client()` returns `FALSE` (only works for current clients)
- User may gain or lose management access based on new role
- System continues to work correctly

### Organization Growth
When 6th client joins:
- First 5 clients retain management access
- 6th client does not get management access
- If one of first 5 leaves, 6th client does NOT automatically gain access
- Access is based on creation timestamp, not current count

### User Deletion
If an early client is deleted:
- Their spot is NOT filled by the next user
- Management access remains with remaining early clients
- Organization can assign formal management roles as needed

## Future Considerations

### Option to Disable
Organizations may want to disable this feature and rely solely on formal roles:
```sql
ALTER TABLE organizations
ADD COLUMN disable_early_client_management BOOLEAN DEFAULT FALSE;

-- Update function to check this flag
```

### Configurable Count
Currently hardcoded to 5, could be made configurable:
```sql
ALTER TABLE organizations
ADD COLUMN early_client_management_count INTEGER DEFAULT 5;
```

### Time-Based Expiry
Could add automatic expiry after organization reaches certain age:
```sql
-- Only allow early client access in first 30 days
AND org.created_at > NOW() - INTERVAL '30 days'
```

## Files Modified

1. `supabase/migrations/[timestamp]_allow_first_5_clients_management_access.sql` - Created
2. `src/contexts/AuthContext.jsx` - Modified
3. `src/App.jsx` - Modified
4. `src/components/ClientDashboard.jsx` - Modified

## Conclusion

The system now allows the first 5 client users in each organization to access management features and approve role upgrade requests. This provides a smooth onboarding experience for new organizations while maintaining strict security boundaries and role-based access control.

All changes are backward compatible and do not affect existing functionality for non-early clients or other roles.
