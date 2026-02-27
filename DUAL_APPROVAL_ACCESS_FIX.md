# Dual Approval Access Fix - Complete Resolution

## Problem
Management users were seeing "You do not have management access to approve role upgrade requests" even though they had management roles.

## Root Causes

### 1. Frontend Access Check Too Restrictive
The `DualApprovalInterface` component only checked for `organization_user_access` entries, ignoring users with management roles.

### 2. Database RLS Policies Inconsistent
- SELECT policies on `role_upgrade_requests` had multiple conflicting rules
- INSERT policy on `role_upgrade_approvals` only checked `organization_user_access` table
- Frontend and backend access checks were misaligned

## Complete Solution

### Database Changes

#### Migration 1: `fix_role_upgrade_requests_visibility_v2.sql`
Simplified SELECT policies on `role_upgrade_requests`:

1. **view_own_requests** - Users can view their own requests
2. **view_org_requests_by_role** - Users with admin/management/senior_partner roles can view all org requests
3. **view_org_requests_by_access** - Users with active organization_user_access can view all org requests

#### Migration 2: `fix_role_upgrade_approvals_insert_policy.sql`
Updated INSERT policy on `role_upgrade_approvals`:

- **management_can_insert_approvals** - Allows insertion if:
  - User is the approver (security check)
  - AND user has management role (admin/management/senior_partner)
  - OR user has active organization_user_access entry

### Frontend Changes

#### DualApprovalInterface.jsx
Updated `checkAccessAndLoadData()` function to check BOTH:
- `organization_user_access` table entries
- User's role (admin/management/senior_partner)

```javascript
// User has management access if they have org access OR management role
const hasAccess = !!accessCheck ||
  (userProfile && ['admin', 'management', 'senior_partner'].includes(userProfile.role));
```

## Access Matrix

| User Type | Can View Requests | Can Approve Requests |
|-----------|------------------|---------------------|
| Own request creator | ✓ (own only) | ✗ |
| Management role user | ✓ (all in org) | ✓ |
| Senior partner role | ✓ (all in org) | ✓ |
| Admin role | ✓ (all in org) | ✓ |
| User with org_access | ✓ (all in org) | ✓ |
| Staff/Compliance | ✗ | ✗ |

## Current Test Users in Bower & Associates

| User | Email | Role | Can Access Dual Approval |
|------|-------|------|-------------------------|
| Jack Bower | jb@gmail.com | management | ✓ Yes (via role) |
| Anna Schmitz | as@gmail.com | management | ✓ Yes (via role) |
| John D. Doe | jdd@gmail.com | management | ✓ Yes (via role) |
| Juma Ally | jumaa@gmail.com | staff | ✗ No |
| John Doe | jd@gmail.com | compliance_officer | ✗ No |

## Current Pending Request

- **Requester**: John D. Doe (jdd@gmail.com)
- **Current Role**: management
- **Requested Role**: staff
- **Status**: pending
- **Can be approved by**: Jack Bower, Anna Schmitz (requires 2 approvals)

## How to Test

1. **Log in as Jack Bower** (jb@gmail.com)
2. Navigate to **Management Dashboard**
3. You should now see:
   - No "You do not have management access" error
   - The "Role Upgrade Requests - Dual Approval" section
   - John D. Doe's pending request visible
   - Approve/Reject buttons enabled

4. **Click "Approve"** on John's request
   - This should create an approval record
   - Request should show "1 / 2 approvals"

5. **Log in as Anna Schmitz** (as@gmail.com)
6. Navigate to **Management Dashboard**
7. **Click "Approve"** on the same request
   - This should create the 2nd approval
   - The role upgrade should be automatically processed
   - John D. Doe's role should change from "management" to "staff"

## Verification Queries

```sql
-- Check if user has access
SELECT
  up.email,
  up.role,
  CASE
    WHEN up.role IN ('admin', 'management', 'senior_partner') THEN 'Yes (via role)'
    WHEN EXISTS (
      SELECT 1 FROM organization_user_access oua
      WHERE oua.user_id = up.id AND oua.is_active = true
    ) THEN 'Yes (via org access)'
    ELSE 'No'
  END as has_management_access
FROM user_profiles up
WHERE up.organization_id = 'e79c5c95-6487-4804-8bb0-85d43a86f470';

-- View current requests
SELECT
  r.id,
  up.full_name as requester,
  r.current_user_role,
  r.requested_role,
  r.status,
  r.approvals_count,
  r.approvals_required
FROM role_upgrade_requests r
JOIN user_profiles up ON r.user_id = up.id
WHERE r.organization_id = 'e79c5c95-6487-4804-8bb0-85d43a86f470'
ORDER BY r.created_at DESC;
```

## Security Guarantees

✓ Users cannot approve their own requests (enforced by RPC function)
✓ Only management-level users can approve requests
✓ Requires 2 distinct approvals before role change takes effect
✓ All changes are audited in role_upgrade_approvals table
✓ RLS policies prevent unauthorized access at database level
