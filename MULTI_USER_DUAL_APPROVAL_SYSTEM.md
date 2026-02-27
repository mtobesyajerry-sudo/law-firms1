# Multi-User Organization Access with Dual Approval System

## Overview

This system implements a secure multi-user organization structure with dual approval workflow for role upgrades. It provides strong security controls to ensure that access privileges are properly managed and approved.

## Key Features

### 1. Organization User Limits (Maximum 3 Users)

Each organization can have **up to 3 users** with Management page access. These users are explicitly granted access by system administrators and tracked in the `organization_user_access` table.

**Why 3 users?**
- Provides redundancy and coverage
- Enables dual approval workflow (2 out of 3)
- Prevents single point of failure
- Maintains security through limited access

### 2. Dual Approval Workflow

Role upgrade requests (e.g., Client → Staff, Client → Compliance Officer) require approval from **2 of the 3 authorized management users**.

**Security Features:**
- Users cannot approve their own requests
- Each user can only approve once per request
- Request automatically processed when 2 approvals received
- Full audit trail of all approvals

### 3. Automatic Access Control

The system automatically manages access to the Management page:
- Users with explicit organization access can view/approve requests
- Access can be revoked by administrators
- Only active access grants are considered
- Database-level enforcement via RLS policies

## Database Structure

### New Tables

#### `organization_user_access`
Tracks which users have management access for each organization.

```sql
CREATE TABLE organization_user_access (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES user_profiles,
  granted_by uuid REFERENCES user_profiles,
  granted_at timestamptz,
  is_active boolean,
  -- Maximum 3 active users per organization (enforced by trigger)
);
```

#### `role_upgrade_approvals`
Tracks individual approvals for role upgrade requests.

```sql
CREATE TABLE role_upgrade_approvals (
  id uuid PRIMARY KEY,
  request_id uuid REFERENCES role_upgrade_requests,
  approver_user_id uuid REFERENCES user_profiles,
  organization_id uuid REFERENCES organizations,
  approved_at timestamptz,
  comments text,
  -- One approval per user per request (enforced by unique constraint)
);
```

#### Enhanced `role_upgrade_requests`
Extended to support dual approval workflow.

```sql
ALTER TABLE role_upgrade_requests ADD COLUMN:
  - approvals_count integer DEFAULT 0
  - approvals_required integer DEFAULT 2
  - approved_by_user_ids uuid[]
```

## User Workflows

### For System Administrators

1. **Grant Organization Management Access**
   - Navigate to Admin Dashboard → Organization Users tab
   - Select an organization
   - Choose a user to grant access (up to 3 per organization)
   - Access is immediately active

2. **Revoke Organization Management Access**
   - Navigate to Admin Dashboard → Organization Users tab
   - Find the user in the organization's list
   - Click "Revoke Access"
   - Access is immediately deactivated

3. **Monitor Approval Activity**
   - Navigate to Admin Dashboard → Role Approvals tab
   - View all approval requests across all organizations
   - See approval status and history

### For Organization Management Users

1. **Access the Management Page**
   - Log in to Client Dashboard
   - If granted management access, the Management section will be available
   - Click on Management to access organization controls

2. **Approve Role Upgrade Requests**
   - Navigate to Management Dashboard → Users tab
   - View pending role upgrade requests
   - See approval status (e.g., "0 of 2 approvals")
   - Click "Approve" to approve a request
   - Request automatically processes after 2 approvals

3. **Reject Role Upgrade Requests**
   - Click "Reject" on any pending request
   - Provide a reason for rejection
   - User is notified of rejection

### For Users Requesting Role Upgrades

1. **Submit a Role Upgrade Request**
   - Navigate to Client Dashboard
   - Click "Request Access to Staff/Compliance Pages"
   - Select desired role (Staff or Compliance Officer)
   - Provide justification
   - Submit request

2. **Track Request Status**
   - View request status in dashboard
   - See how many approvals received (e.g., "1 of 2 approvals")
   - Notified when fully approved or rejected

## Security Features

### Database-Level Security

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access data for their organization
   - Administrators can access all data

2. **Constraint Enforcement**
   - Maximum 3 active users per organization (database trigger)
   - One approval per user per request (unique constraint)
   - Cannot approve own requests (application logic + database function)

3. **Audit Trail**
   - All access grants recorded with granter ID and timestamp
   - All approvals recorded with approver ID and timestamp
   - Full history maintained for compliance

### Application-Level Security

1. **Access Validation**
   - Check organization_user_access before showing Management page
   - Validate user has management access before processing approvals
   - Prevent self-approval attempts

2. **Function-Level Security**
   - `process_role_upgrade_approval()` function with SECURITY DEFINER
   - Validates all approval rules before processing
   - Returns detailed success/error messages

## Helper Functions

### `check_user_has_management_access(user_id, org_id)`
Returns `true` if user has active management access for the organization.

```sql
SELECT check_user_has_management_access(
  'user-uuid',
  'org-uuid'
);
```

### `can_add_management_user(org_id)`
Returns `true` if organization has fewer than 3 active management users.

```sql
SELECT can_add_management_user('org-uuid');
```

### `process_role_upgrade_approval(request_id, approver_id)`
Processes an approval and returns status information.

```sql
SELECT process_role_upgrade_approval(
  'request-uuid',
  'approver-uuid'
);
-- Returns:
-- {
--   "success": true,
--   "fully_approved": true/false,
--   "approvals_count": 2,
--   "message": "..."
-- }
```

### `get_organization_management_users(org_id)`
Returns list of users with management access for an organization.

```sql
SELECT * FROM get_organization_management_users('org-uuid');
-- Returns: user_id, email, full_name
```

## UI Components

### `OrganizationUserManagement`
- System administrator interface
- Grant/revoke management access
- View all organizations and their management users
- Enforce 3-user limit per organization

### `DualApprovalInterface`
- Display role upgrade requests
- Show approval status and history
- Allow authorized users to approve/reject
- Prevent self-approval
- Update in real-time

### Updated `ClientDashboard`
- Check for organization management access
- Show Management page if user has access
- Display approval interface in management section

### Updated `ClientManagementDashboard`
- Integrate dual approval interface
- Replace old single-approval system
- Show approval counts and status

## Migration Path

The system is backward compatible with existing role upgrade requests. All existing requests will:
- Default to requiring 2 approvals
- Start with 0 approvals count
- Work with the new dual approval workflow

## Best Practices

### For Administrators

1. **Choose management users carefully**
   - Select users who understand organizational needs
   - Ensure users are available to respond to requests
   - Consider geographical distribution for 24/7 coverage

2. **Grant access progressively**
   - Start with 2 users, add 3rd if needed
   - Monitor approval activity
   - Revoke inactive users

3. **Monitor approval patterns**
   - Check for delayed approvals
   - Identify bottlenecks
   - Ensure balanced approval load

### For Management Users

1. **Review requests promptly**
   - Check for pending requests regularly
   - Respond within 24-48 hours
   - Coordinate with other approvers

2. **Document rejection reasons**
   - Provide clear, actionable feedback
   - Help users understand requirements
   - Maintain professional communication

3. **Validate requests thoroughly**
   - Review user's current role and responsibilities
   - Verify justification is legitimate
   - Consider organizational needs

## Troubleshooting

### "Maximum 3 active users per organization allowed"
- Check how many active users the organization currently has
- Revoke access for inactive users before adding new ones
- Consider if all 3 users are necessary

### "You have already approved this request"
- Each user can only approve once per request
- If you need to change your approval, contact an administrator
- Wait for another authorized user to provide the second approval

### "Cannot approve your own request"
- Self-approval is not allowed for security reasons
- Request must be approved by other management users
- Contact your organization's management team

### "Approver does not have management access"
- User must have active entry in organization_user_access
- Contact system administrator to grant access
- Verify organization_id matches

## Integration Points

### With Existing Systems

1. **Role Upgrade Requests**
   - Extended existing table structure
   - Maintains backward compatibility
   - All existing functionality preserved

2. **User Profiles**
   - No changes to user_profiles structure
   - Access control layered on top
   - Existing roles still work

3. **Organizations**
   - No changes to organizations table
   - Access control via separate table
   - One-to-many relationship maintained

## Future Enhancements

Possible improvements for future iterations:

1. **Configurable approval thresholds**
   - Allow organizations to choose 1, 2, or 3 required approvals
   - Support different thresholds for different role changes

2. **Approval expiration**
   - Auto-reject requests after X days
   - Send reminders to approvers

3. **Approval delegation**
   - Allow temporary delegation of approval authority
   - Support vacation/absence scenarios

4. **Enhanced notifications**
   - Email notifications for pending requests
   - SMS alerts for urgent approvals
   - In-app notification center

5. **Approval analytics**
   - Track average approval time
   - Identify bottlenecks
   - Generate approval reports

## Summary

The Multi-User Dual Approval System provides a robust, secure framework for managing organization access and role upgrades. By limiting management access to 3 users per organization and requiring 2 approvals for role changes, the system ensures strong security controls while maintaining operational flexibility.

Key benefits:
- Strong security through limited access
- Dual approval prevents unilateral decisions
- Full audit trail for compliance
- Flexible enough for various organization sizes
- Scalable to many organizations

The system is production-ready and fully integrated with the existing application infrastructure.
