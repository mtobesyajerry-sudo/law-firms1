# Role Upgrade Request System - Security Redesign

## Overview

The role upgrade request system has been completely redesigned to address critical security requirements. Role upgrade requests can now ONLY be created by management users for OTHER users within their organization, and the requester CANNOT approve their own request.

## Security Requirements Implemented

### 1. Management-Only Request Creation
- **Old System**: Users could request role upgrades for themselves from their own dashboard
- **New System**: Role upgrade requests can ONLY be created from the Management Dashboard
- **Benefit**: Management controls who gets elevated permissions

### 2. No Self-Approval
- **Old System**: Users could potentially approve requests they created
- **New System**: The user who creates a request CANNOT approve it
- **Implementation**: Added `requested_by` field to track the creator

### 3. Dual Approval by Different Users
- **Requirement**: Any 2 of the 3 management users must approve
- **Rule**: Neither the requester NOR the subject of the request can approve
- **Example**: If Anna creates a request for John, Anna cannot approve it and John cannot approve it. Only Jack and other management users can approve.

## Database Changes

### New Field: `requested_by`

```sql
ALTER TABLE role_upgrade_requests
ADD COLUMN requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

- **Purpose**: Track which management user created the request
- **Security**: Prevents the requester from approving their own request
- **Existing Data**: Set to NULL (can be approved by any management user except the subject)

## Frontend Changes

### 1. ClientManagementDashboard Component

**New Features:**
- Added "Request Role Change" button on each user card
- Users cannot request role changes for themselves (button hidden for own profile)
- Modal interface for creating role change requests with:
  - User details (name, email, current role)
  - New role selection dropdown
  - Justification text area (required)
  - Security notice about dual approval requirement

**Location:** `/dashboard/management` → "Organization Users" tab

### 2. DualApprovalInterface Component

**Enhanced Security:**
- Now checks BOTH `isOwnRequest` (subject) and `isRequester` (creator)
- Button states:
  - "Approve" - user can approve
  - "Your Request" - user is the subject
  - "You Requested" - user created the request
  - "Already Approved" - user has already approved
- Shows "Requested By" field to display who created the request
- Loads requester information with proper join

### 3. ClientDashboard Component

**Removed Features:**
- Removed `RoleUpgradeRequestForm` import
- Removed self-service role upgrade request button
- Changed info message to direct users to contact management

**New Message:**
> "To request access to additional system features, please contact your organization's management team. Role changes require approval from authorized management users within your organization for security reasons."

## User Workflow

### Creating a Role Upgrade Request (Management Users)

1. Management user logs in and navigates to `/dashboard/management`
2. Goes to "Organization Users" tab
3. Finds the user who needs a role change
4. Clicks "Request Role Change" button (not available for own profile)
5. Fills out the modal:
   - Selects new role from dropdown
   - Provides detailed justification
6. Clicks "Create Request"
7. Request is created with `requested_by` set to current management user's ID

### Approving a Role Upgrade Request

1. Management user navigates to "Role Upgrade Requests" section
2. Sees all pending and approved requests
3. For each request, sees:
   - Who the request is for (user name/email)
   - Current role and requested role
   - Who requested it ("Requested By" field)
   - Approvals received (count and names)
   - Justification
4. Approval button states:
   - **Disabled "Your Request"**: User is the subject of the request
   - **Disabled "You Requested"**: User created the request
   - **Disabled "Already Approved"**: User has already approved
   - **Enabled "Approve"**: User can approve
5. Clicks "Approve" if allowed
6. After 2 approvals, role is automatically updated

## Security Features

### Prevents Self-Approval
```javascript
const isOwnRequest = request.user_id === user.id;  // Subject of request
const isRequester = request.requested_by === user.id;  // Creator of request
const canApprove = !hasUserApproved && !isOwnRequest && !isRequester && request.status === 'pending';
```

### Tracks Request Creator
```javascript
await supabase
  .from('role_upgrade_requests')
  .insert({
    user_id: selectedUserForRoleChange.id,  // Who the request is for
    requested_by: profile.id,  // Who created the request
    organization_id: organization.id,
    // ... other fields
  });
```

### Displays Creator Information
```javascript
.select(`
  *,
  user:user_profiles!role_upgrade_requests_user_id_fkey(id, email, full_name),
  requester:user_profiles!role_upgrade_requests_requested_by_fkey(id, email, full_name)
`)
```

## Testing Scenario

### Setup
- Organization: Bower & Associates
- Management Users: Anna Schmitz, Jack Bower, John D. Doe

### Test Case 1: Anna Creates Request for John
1. Anna logs in → Management Dashboard → Organization Users
2. Anna clicks "Request Role Change" on John's card
3. Anna fills: New Role = "Staff", Justification = "Transition to staff role"
4. Request created with `requested_by = Anna's ID`
5. Anna sees "You Requested" (cannot approve)
6. John sees "Your Request" (cannot approve)
7. Jack sees "Approve" button (can approve)
8. After Jack + one more management user approve → John's role changes to Staff

### Test Case 2: Existing Requests (Null requested_by)
1. Existing requests have `requested_by = NULL`
2. Any management user can approve EXCEPT the subject
3. John's existing request: Anna and Jack can approve, John cannot

## Migration Path

### For Existing Requests
- `requested_by` is NULL for existing requests
- These can be approved by any management user except the subject
- No data migration needed
- System gracefully handles NULL values

## Benefits

1. **Security**: Prevents self-approval and unauthorized role changes
2. **Accountability**: Clear audit trail of who requested what
3. **Transparency**: Users see who created each request
4. **Control**: Management has full control over role assignments
5. **Compliance**: Meets separation of duties requirements

## Files Modified

1. **Database Migration**: `supabase/migrations/20260223053523_add_requested_by_to_role_upgrade_requests.sql`
2. **Management Dashboard**: `src/components/ClientManagementDashboard.jsx`
3. **Approval Interface**: `src/components/DualApprovalInterface.jsx`
4. **Client Dashboard**: `src/components/ClientDashboard.jsx`

## Summary

The role upgrade request system now properly implements dual approval with separation of duties. Management users create requests for other users, and the creator cannot approve their own request. This ensures that any role change requires independent review from at least 2 management users who were not involved in initiating the request.
