# Role Upgrade Request Display Fix

## Issue Identified

A pending role upgrade request was not displaying on the Management Dashboard. Investigation revealed that the request was created by the logged-in user (Jack Bower) for himself, and the system was correctly filtering it out because users should not be able to approve their own role upgrade requests.

## Root Cause

**The System Was Working Correctly!**

The issue was not a bug but rather a UX/expectation mismatch:

1. Jack Bower (the only user) submitted a role upgrade request for himself
2. The Management Dashboard correctly filtered out self-requests (users cannot approve their own requests)
3. Since Jack was the only user, there were no OTHER users' requests to display
4. The statistics showed "0" pending requests because it only counts requests the user can act upon
5. This created the impression that the request wasn't there, when in fact it was properly filtered

## The Fix

Enhanced the Management Dashboard to provide clear feedback when a user has a pending self-request:

### Changes Made

**File**: `src/components/ClientManagementDashboard.jsx`

#### 1. Updated Statistics Calculation
```javascript
// Before: Counted ALL pending requests
pendingRoleRequests: roleRequests.filter(r => r.status === 'pending').length

// After: Only counts requests from OTHER users that this user can approve
pendingRoleRequests: roleRequests.filter(r => r.status === 'pending' && r.user_id !== profile?.id).length
```

#### 2. Enhanced Request Display Logic
```javascript
// Show section if there are ANY pending requests (including self-requests)
{roleUpgradeRequests.filter(r => r.status === 'pending').length > 0 && (
  <div>
    {/* If there are requests from other users */}
    {roleUpgradeRequests.filter(r => r.status === 'pending' && r.user_id !== profile?.id).length > 0 ? (
      // Show the list of requests that can be approved
    ) : (
      // Show helpful message about self-request
    )}
  </div>
)}
```

#### 3. Added Self-Request Notification

When a user has only their own pending request, they now see:

```
⏳
Your Role Upgrade Request is Pending

You cannot approve your own role upgrade request. Another management user
or admin needs to review and approve it.

Tip: Have another authorized user (admin, management, senior partner, or
one of the first 5 clients) log in to approve your request.
```

#### 4. Added Debug Logging
```javascript
// Log errors for debugging
if (roleRequestsRes.error) {
  console.error('Error loading role requests:', roleRequestsRes.error);
}

console.log('Role upgrade requests loaded:', roleRequests);
console.log('Pending requests:', roleRequests.filter(r => r.status === 'pending'));
```

## How It Works Now

### Scenario 1: User with Self-Request Only (Current Situation)
**User**: Jack Bower
**Request**: Jack requesting "staff" role
**Dashboard Shows**:
- Statistics show "0" pending role requests (correct - he can't approve his own)
- "Pending Role Upgrade Requests" section appears
- Shows message: "Your Role Upgrade Request is Pending"
- Explains that another authorized user needs to approve it

### Scenario 2: User Viewing Other Users' Requests
**User**: Jane Smith (admin or early client)
**Request**: Jack requesting "staff" role
**Dashboard Shows**:
- Statistics show "1" pending role request
- "Pending Role Upgrade Requests" section appears
- Shows Jack's request with Approve/Reject buttons
- Jane can approve or reject the request

### Scenario 3: Multiple Requests Including Self
**User**: Jack Bower
**Requests**:
- Jack requesting "staff" role (own request)
- John Doe requesting "lawyer" role (other user)

**Dashboard Shows**:
- Statistics show "1" pending role request (only John's, not Jack's own)
- "Pending Role Upgrade Requests" section appears
- Shows John's request with Approve/Reject buttons
- Jack can approve John's request but not his own

## Security Features Maintained

### Cannot Approve Own Request
✅ Users cannot see their own requests in the approval list
✅ Users cannot click approve on their own requests
✅ Self-requests are filtered at UI level

### Who Can Approve Requests

The following roles can approve role upgrade requests:
1. **Admin** - Full system access
2. **Senior Partner** - Organization management
3. **Management** - Organization management
4. **Partner** - Organization management
5. **Early Clients** - First 5 clients in organization

### Organization Isolation
✅ Users can only see requests from their own organization
✅ RLS policies enforce organization boundaries
✅ No cross-organization access possible

## Testing

### Test Case 1: Self-Request Display
1. Log in as Jack Bower (client, early client status)
2. Navigate to Management Dashboard → Users tab
3. Should see: "Your Role Upgrade Request is Pending" message
4. Statistics should show "0" pending role requests

### Test Case 2: Create Second User
```sql
-- Create a second user who submits a role request
-- Then Jack should be able to see and approve it
```

### Test Case 3: Admin Approval
1. Log in as admin
2. Navigate to Management Dashboard → Users tab
3. Should see Jack's request with Approve/Reject buttons
4. Statistics should show "1" pending role request

## Database Verification

### Check Existing Requests
```sql
SELECT
  id,
  user_id,
  requested_role,
  status,
  created_at
FROM role_upgrade_requests
WHERE status = 'pending'
ORDER BY created_at DESC;
```

**Current Result**:
```
id: e856d081-cd7d-4b95-9c3a-68a529a9bc54
user_id: c5dede49-235a-43a2-aa4d-3984f8a0d4de (Jack Bower)
requested_role: staff
status: pending
created_at: 2026-02-22 16:50:25
```

### Check User Profile
```sql
SELECT
  id,
  full_name,
  email,
  role,
  organization_id,
  is_early_client(id) as is_early
FROM user_profiles
WHERE id = 'c5dede49-235a-43a2-aa4d-3984f8a0d4de';
```

**Result**:
```
full_name: Jack Bower
email: jb@gmail.com
role: client
is_early: true
```

## Why This Design is Correct

### Prevents Self-Approval
Users should never approve their own role upgrades for security and governance reasons:
- **Conflict of Interest**: Users have incentive to approve their own promotions
- **Audit Trail**: Independent review ensures proper oversight
- **Access Control**: Prevents privilege escalation without authorization

### Clear Communication
The new UI clearly explains:
- Why the request isn't shown (can't approve own request)
- What status the request is in (pending)
- What action is needed (another user must approve)
- Who can approve it (admins, management, early clients)

### Proper Statistics
The badge count now accurately reflects:
- Requests the user CAN take action on
- Excludes requests they CANNOT approve
- Provides actionable information, not just total counts

## Next Steps for Testing

To fully test the approval workflow:

1. **Create a second user** in the same organization:
   - Could be another client (if within first 5)
   - Could be assigned "management" or "senior_partner" role
   - Could be the admin user

2. **Have second user log in** and navigate to Management Dashboard

3. **Second user should see** Jack's request and be able to approve/reject it

4. **After approval**, Jack's role should update to "staff" and the request should be marked as "approved"

## Files Modified

1. `src/components/ClientManagementDashboard.jsx` - Enhanced display logic and added self-request notification

## Conclusion

The system was working correctly all along! The pending request exists and is properly filtered to prevent self-approval. The enhancement provides clear feedback to users about the status of their own requests while maintaining proper security controls.

Users can now understand:
- Their request was submitted successfully
- It's pending approval from another authorized user
- They cannot approve their own request (by design)
- Who needs to log in to approve it
