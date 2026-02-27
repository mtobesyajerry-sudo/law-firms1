# Role Access Request Visibility Fix

## Issue
Role access requests were not showing up for management users who should be able to approve them.

## Root Cause
The RLS (Row Level Security) policies on the `role_upgrade_requests` table had multiple conflicting SELECT policies that were preventing proper access.

## Changes Made

### 1. Database Migration (`fix_role_upgrade_requests_visibility_v2.sql`)
- **Dropped** all old conflicting SELECT policies:
  - "Users can view own role upgrade requests"
  - "Management users can view org role upgrade requests"
  - "Early clients can view role upgrade requests in organization"
  - "Management can view role upgrade requests in organization"

- **Created** three new, clear SELECT policies:
  1. `view_own_requests` - Users can view their own requests
  2. `view_org_requests_by_role` - Users with admin/management/senior_partner roles can view all requests in their organization
  3. `view_org_requests_by_access` - Users with active organization_user_access entries can view all requests in their organization

### 2. Removed "Lawyer" Role
- Removed "Lawyer" from `ROLE_OPTIONS` in `RoleUpgradeRequestForm.jsx`
- Removed "Lawyer" from `ROLE_LABELS` in `RoleUpgradeManagement.jsx`

### 3. Fixed Field Names in DualApprovalInterface
- Already corrected: `request.current_role` → `request.current_user_role`
- Already corrected: `request.reason` → `request.justification`

## Verification

### Current Request in Database
- **Requester**: John D. Doe (jdd@gmail.com)
- **Current Role**: management
- **Requested Role**: staff
- **Status**: pending
- **Justification**: "I want to access My Matters and My Clients"

### Users Who Can See This Request
1. **Jack Bower** (jb@gmail.com) - management role
2. **Anna Schmitz** (as@gmail.com) - management role
3. **John D. Doe** (jdd@gmail.com) - Can see his own request but cannot approve it

## How It Works

When a management user logs into the Client Management Dashboard:
1. The system checks their role (`management`, `admin`, `senior_partner`)
2. The system checks their `organization_user_access` entry
3. If either condition is met, they can view all pending role requests in their organization
4. They can approve requests from other users (not their own)
5. The dual approval system requires 2 approvals before the role change takes effect

## Testing Steps

1. Log in as Jack Bower (jb@gmail.com) or Anna Schmitz (as@gmail.com)
2. Navigate to the Management Dashboard
3. Click on the "Users" tab
4. The pending role request from John D. Doe should be visible in:
   - The "Role Upgrade Requests - Dual Approval" section
   - The "Pending Role Upgrade Requests" section (if implemented)
5. You should be able to approve or reject the request
