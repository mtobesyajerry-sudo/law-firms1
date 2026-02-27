# Client-Level User Management Implementation

## Overview

The Management Dashboard now allows **client users** (with 'management', 'senior_partner', or 'partner' roles) to approve role upgrade requests from users **within their own organization**. This provides organization-level user management without requiring system admin intervention.

## Key Features Implemented

### 1. Role Upgrade Request Approval
**Users with management access can:**
- View pending role upgrade requests from their organization
- See detailed user information and justification
- Approve or reject requests
- Track all users in their organization

### 2. Access Control

**Who Can Access Management Dashboard:**
- Users with role: `management`
- Users with role: `senior_partner`
- Users with role: `partner` (if they have management access)

**Route:** `/dashboard/management`

### 3. Statistics & Monitoring

The dashboard displays:
- **Pending Role Requests**: Count of users requesting role upgrades
- **Total Clients**: Organization's client count
- **Active Matters**: Current active matters
- **High Risk Clients**: Clients flagged as high risk
- **Open Alerts**: Unresolved transaction alerts

### 4. New "Users" Tab

The Users tab provides:

**Pending Role Upgrade Requests Section:**
- User's full name and email
- Current role vs. requested role
- Justification provided by the user
- Timestamp of request
- Approve/Reject action buttons

**Organization Users Section:**
- Complete list of all users in the organization
- User names and email addresses
- Current role badges with color coding
- Role hierarchy visualization

## How It Works

### For Users Requesting Role Upgrades:

1. **User submits request** via "Request Role Upgrade" button on Client Dashboard
2. **Request is stored** in `role_upgrade_requests` table
3. **Management users are notified** (pending count appears on dashboard)
4. **Management reviews** the request with full context
5. **Decision is made**:
   - **Approved**: User's role is updated immediately
   - **Rejected**: Request is marked rejected with reason

### For Management Users:

1. **Login** → Navigate to Client Dashboard
2. **Click "Management" section**
3. **View "Users" tab** (shows pending count in tab label)
4. **Review requests** with full justification
5. **Approve or reject** with single click
6. **Monitor all organization users** in one view

## Database Operations

### When Approving a Request:

```sql
-- Update user's role
UPDATE user_profiles
SET role = 'requested_role'
WHERE id = 'user_id';

-- Mark request as approved
UPDATE role_upgrade_requests
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = 'approver_id'
WHERE id = 'request_id';
```

### When Rejecting a Request:

```sql
-- Mark request as rejected
UPDATE role_upgrade_requests
SET
  status = 'rejected',
  reviewed_at = NOW(),
  reviewed_by = 'approver_id',
  rejection_reason = 'reason_text'
WHERE id = 'request_id';
```

## Role Color Coding

The dashboard uses distinct colors for each role:

- **Admin**: Blue (`#dbeafe` / `#1e40af`)
- **Senior Partner**: Indigo (`#e0e7ff` / `#4338ca`)
- **Management**: Purple (`#f3e8ff` / `#7c3aed`)
- **Partner**: Amber (`#fef3c7` / `#d97706`)
- **Compliance Officer**: Pink (`#fce7f3` / `#db2777`)
- **Staff**: Green (`#dcfce7` / `#16a34a`)
- **Client**: Gray (`#f3f4f6` / `#6b7280`)

## Security & Access Control

### Organization Isolation
- Users can **only** see and approve requests from their own organization
- RLS policies ensure data isolation at organization level
- No cross-organization access is possible

### Audit Trail
- All approvals/rejections are tracked with:
  - `reviewed_at`: Timestamp
  - `reviewed_by`: ID of approving user
  - `rejection_reason`: For rejected requests

### Permission Hierarchy
1. **Admin**: System-wide control (Admin Dashboard)
2. **Management/Senior Partner**: Organization-level control (Management Dashboard)
3. **Client**: Can request upgrades but cannot approve

## User Experience Flow

### Scenario 1: Staff Requesting Management Role

```
1. Staff User clicks "Request Role Upgrade"
2. Selects "management" role
3. Provides justification
4. Submits request

5. Management User logs in
6. Sees notification: "Pending Role Requests (1)"
7. Clicks "Users" tab
8. Reviews staff member's justification
9. Clicks "Approve"
10. Staff user's role is immediately upgraded

11. Staff user logs out and back in
12. Now has access to Management Dashboard
```

### Scenario 2: Partner Reviewing Multiple Requests

```
1. Partner with management access logs in
2. Dashboard shows: "Pending Role Requests (3)"
3. Clicks Users tab
4. Reviews all 3 requests:
   - Staff → Compliance Officer (Approved)
   - Client → Staff (Approved)
   - Client → Partner (Rejected - insufficient experience)
5. All decisions processed
6. Dashboard updates to show 0 pending requests
```

## Benefits

### For Organizations:
- **Autonomy**: Manage team without admin intervention
- **Quick Response**: Approve requests immediately
- **Transparency**: See all organization users and roles
- **Control**: Maintain proper role hierarchy

### For Users:
- **Clear Process**: Structured role upgrade workflow
- **Visibility**: Know when requests are reviewed
- **Context**: Provide justification for requests
- **Feedback**: Receive approval/rejection notifications

### For Admins:
- **Reduced Workload**: Organizations self-manage
- **Better Scaling**: System handles multiple organizations
- **Oversight**: Can still monitor via Admin Dashboard
- **Flexibility**: Organizations adapt to their needs

## Files Modified

1. **Created/Modified**: `src/components/ClientManagementDashboard.jsx`
   - Added role upgrade request approval functionality
   - Added Users tab with pending requests and user list
   - Implemented approve/reject handlers
   - Added statistics for pending requests

## Testing Checklist

- [ ] Client user can submit role upgrade request
- [ ] Management user sees pending request notification
- [ ] Management user can view request details
- [ ] Approval updates user role immediately
- [ ] Rejection marks request as rejected
- [ ] Only organization users are visible
- [ ] Statistics update correctly
- [ ] Role badges display proper colors
- [ ] Timestamps show correct dates
- [ ] Justification text displays properly

## Next Steps (Future Enhancements)

1. **Email Notifications**: Notify users when requests are approved/rejected
2. **Bulk Actions**: Approve/reject multiple requests at once
3. **Request History**: View all past requests and decisions
4. **Role Restrictions**: Define which roles can approve which upgrades
5. **Expiration Rules**: Auto-reject old pending requests
6. **Analytics**: Track approval rates and decision times
